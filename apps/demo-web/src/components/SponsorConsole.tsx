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
  const [targets, setTargets] = useState(process.env.NEXT_PUBLIC_DEMO_DAPP_ADDRESS ?? "");
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

      const allowedTargets = targets
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => {
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

  const spent = status ? formatAmount(hexToBigInt(status.spent), 18, 5) : null;
  const budget = status ? formatAmount(hexToBigInt(status.budget), 18, 5) : null;
  const remaining = status ? formatAmount(hexToBigInt(status.remainingBudget), 18, 5) : null;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Sponsor Console</h2>
          <p className="card-subtitle">Create a campaign, switch the active sponsor budget, and keep the spend meter live while polling.</p>
        </div>
        <button className="button button--ghost" disabled={isRefreshing} onClick={handleLoad}>
          {isRefreshing ? "Refreshing..." : "Load Campaign"}
        </button>
      </div>

      <div className="form-grid" style={{ marginTop: 18 }}>
        <label className="field">
          <span className="label">Active Campaign ID</span>
          <input className="input" value={campaignIdInput} onChange={(event) => setCampaignIdInput(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Campaign Name</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Budget (PAS)</span>
          <input className="input" value={budgetPas} onChange={(event) => setBudgetPas(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Allowed Targets</span>
          <textarea className="input input--textarea" value={targets} onChange={(event) => setTargets(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Per-User Max Ops</span>
          <input className="input" value={perUserMaxOps} onChange={(event) => setPerUserMaxOps(event.target.value)} />
        </label>
        <label className="field">
          <span className="label">Duration (Minutes)</span>
          <input className="input" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} />
        </label>
      </div>

      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="button" disabled={isSubmitting} onClick={handleCreate}>
          {isSubmitting ? "Creating..." : "Create Campaign"}
        </button>
      </div>

      {feedback ? <div className="feedback feedback--success">{feedback}</div> : null}
      {error ? <ErrorNotice error={error} /> : null}

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
