"use client";

import { useEffect, useState } from "react";
import { getAddress, hexToBigInt, isAddress, keccak256, parseEther, stringToHex } from "viem";
import { useAccount } from "wagmi";

import { ErrorNotice } from "@/components/ErrorNotice";
import { createCampaign, fetchCampaignStatus, type CampaignStatus } from "@/lib/campaign-client";
import { formatAmount } from "@/lib/flowResults";
import { toUiError, type UiError } from "@/lib/uiError";

export function SponsorConsole(props: {
  campaignId: `0x${string}`;
  onCampaignChange: (campaignId: `0x${string}`) => void;
  refreshKey: number;
}) {
  const { address } = useAccount();
  const [campaignIdInput, setCampaignIdInput] = useState<string>(props.campaignId);
  const [name, setName] = useState("DotFuel Launch Day");
  const [budgetPas, setBudgetPas] = useState("0.25");
  const [targets, setTargets] = useState<string[]>(() => {
    const defaultTarget = process.env.NEXT_PUBLIC_DEMO_DAPP_ADDRESS;
    if (!defaultTarget || !isAddress(defaultTarget)) {
      return [];
    }
    return [getAddress(defaultTarget)];
  });
  const [targetDraft, setTargetDraft] = useState("");
  const [perUserMaxOps, setPerUserMaxOps] = useState("3");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  useEffect(() => {
    setCampaignIdInput(props.campaignId);
  }, [props.campaignId]);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      if (!props.campaignId) {
        setStatus(null);
        return;
      }

      setIsRefreshing(true);
      setError(null);

      try {
        const nextStatus = await fetchCampaignStatus(props.campaignId, address);
        if (!cancelled) {
          setStatus(nextStatus);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(toUiError(nextError, "campaign"));
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    loadStatus();
    const interval = window.setInterval(loadStatus, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [address, props.campaignId, props.refreshKey]);

  async function handleCreate() {
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Campaign name is required");
      }

      const allowedTargets = targets.map((value) => {
        if (!isAddress(value)) {
          throw new Error(`Invalid target: ${value}`);
        }
        return getAddress(value);
      });

      if (allowedTargets.length === 0) {
        throw new Error("At least one allowed target is required");
      }

      const duration = Number(durationMinutes);
      const perUser = Number(perUserMaxOps);
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error("Duration must be a positive number");
      }
      if (!Number.isFinite(perUser) || perUser <= 0) {
        throw new Error("Per-user max ops must be positive");
      }

      const start = Math.floor(Date.now() / 1000);
      const end = start + duration * 60;
      const campaignId = keccak256(stringToHex(`${trimmedName}:${Date.now()}`));
      const result = await createCampaign({
        campaignId,
        start,
        end,
        budget: parseEther(budgetPas),
        allowedTargets,
        perUserMaxOps: perUser
      });

      props.onCampaignChange(campaignId);
      setCampaignIdInput(campaignId);
      setFeedback(`Campaign ready: ${campaignId.slice(0, 12)}... (${result.txHash.slice(0, 12)}...)`);
    } catch (nextError) {
      setError(toUiError(nextError, "campaign"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLoad() {
    setError(null);
    if (!/^0x[a-fA-F0-9]{64}$/.test(campaignIdInput)) {
      setError(toUiError("Campaign ID must be a 32-byte hex value", "campaign"));
      return;
    }

    props.onCampaignChange(campaignIdInput as `0x${string}`);
  }

  function handleAddTarget() {
    setError(null);
    const value = targetDraft.trim();
    if (!value) return;
    if (!isAddress(value)) {
      setError(toUiError(`Invalid target: ${value}`, "campaign"));
      return;
    }

    const normalized = getAddress(value);
    setTargets((current) => (current.includes(normalized) ? current : [...current, normalized]));
    setTargetDraft("");
  }

  function handleRemoveTarget(target: string) {
    setTargets((current) => current.filter((value) => value !== target));
  }

  const spentBig = status ? hexToBigInt(status.spent) : 0n;
  const budgetBig = status ? hexToBigInt(status.budget) : 0n;
  const spentPct = budgetBig > 0n ? Math.min(100, Number((spentBig * 10000n) / budgetBig) / 100) : 0;
  const budgetBarColor = spentPct >= 90 ? "var(--danger)" : spentPct >= 70 ? "#d97706" : "var(--success)";

  const spent = status ? formatAmount(spentBig, 18, 5) : null;
  const budget = status ? formatAmount(budgetBig, 18, 5) : null;
  const remaining = status ? formatAmount(hexToBigInt(status.remainingBudget), 18, 5) : null;
  const isCampaignIdValid = /^0x[a-fA-F0-9]{64}$/.test(campaignIdInput);

  return (
    <section className="card card--data">
      <div className="card-header">
        <div>
          <h2 className="card-title">Sponsor Console</h2>
          <p className="card-subtitle">Create and manage gas sponsorship campaigns for your users.</p>
        </div>
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <span className="label">Active Campaign ID</span>
        <div className="target-input-row">
          <input
            className={`input ${campaignIdInput.length > 0 ? (isCampaignIdValid ? "input--valid" : "input--invalid") : ""}`}
            placeholder="0x0000...0000 (32 bytes)"
            value={campaignIdInput}
            onChange={(event) => setCampaignIdInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleLoad();
              }
            }}
          />
          <button className="button button--ghost" disabled={isRefreshing} onClick={handleLoad} type="button">
            {isRefreshing ? <span className="button__spinner" aria-hidden /> : null}
            {isRefreshing ? "Loading..." : "Load"}
          </button>
        </div>
        <span className="field-hint">Format: 0x0000...0000 (32-byte hex)</span>
      </div>

      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="button button--accent" disabled={isSubmitting} onClick={handleCreate}>
          {isSubmitting ? <span className="button__spinner" aria-hidden /> : null}
          {isSubmitting ? "Creating..." : "Create Campaign"}
        </button>
      </div>

      <details className="advanced-console">
        <summary>Advanced Campaign Settings</summary>
        <div className="form-grid" style={{ marginTop: 14 }}>
          <label className="field">
            <span className="label">Campaign Name</span>
            <input
              className="input"
              placeholder="DotFuel Launch Day"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Budget (PAS)</span>
            <input
              className="input"
              min={0.001}
              step={0.001}
              type="number"
              placeholder="0.25"
              value={budgetPas}
              onChange={(event) => setBudgetPas(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Per-User Max Ops</span>
            <input
              className="input"
              min={1}
              step={1}
              type="number"
              placeholder="3"
              value={perUserMaxOps}
              onChange={(event) => setPerUserMaxOps(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Duration (Minutes)</span>
            <input
              className="input"
              min={1}
              step={1}
              type="number"
              placeholder="90"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
            />
          </label>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <span className="label">Allowed Targets</span>
          <div className="target-tag-list">
            {targets.length === 0 ? <span className="card-subtitle">Add at least one target address.</span> : null}
            {targets.map((target) => (
              <span className="target-tag" key={target}>
                {target.slice(0, 8)}...{target.slice(-4)}
                <button className="target-tag__remove" onClick={() => handleRemoveTarget(target)} type="button">
                  Remove
                </button>
              </span>
            ))}
          </div>
          <div className="target-input-row">
            <input
              className="input"
              placeholder="0x0000000000000000000000000000000000000000"
              value={targetDraft}
              onChange={(event) => setTargetDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddTarget();
                }
              }}
            />
            <button className="button button--ghost" onClick={handleAddTarget} type="button">
              Add target
            </button>
          </div>
        </div>
      </details>

      {feedback ? <div className="feedback feedback--success">{feedback}</div> : null}
      {error ? <ErrorNotice error={error} /> : null}

      {status && budgetBig > 0n ? (
        <div className="budget-bar-wrap">
          <div className="budget-bar-header">
            <span className="label">Budget Spent</span>
            <span className="budget-bar-pct">{spentPct.toFixed(1)}%</span>
          </div>
          <div className="budget-bar">
            <div className="budget-bar__fill" style={{ width: `${spentPct}%`, background: budgetBarColor }} />
          </div>
        </div>
      ) : null}

      <div className="status-grid">
        <article className="status-card">
          <span className="label">Status</span>
          <strong>{status ? (status.enabled ? "Enabled" : "Disabled") : "Unknown"}</strong>
          <span className="card-subtitle">Polling every 10 seconds</span>
        </article>
        <article className="status-card">
          <span className="label">Budget</span>
          <strong>{budget ? `${budget} PAS` : "Pending"}</strong>
          <span className="card-subtitle">Spent: {spent ? `${spent} PAS` : "-"}</span>
        </article>
        <article className="status-card">
          <span className="label">Remaining</span>
          <strong>{remaining ? `${remaining} PAS` : "Pending"}</strong>
          <span className="card-subtitle">Per-user cap: {status?.perUserMaxOps ?? "-"}</span>
        </article>
        <article className="status-card">
          <span className="label">Ops Count</span>
          <strong>{typeof status?.userOpsUsed === "number" ? status.userOpsUsed : "-"}</strong>
          <span className="card-subtitle">{address ? "Connected wallet usage" : "Connect wallet for per-user count"}</span>
        </article>
      </div>
    </section>
  );
}
