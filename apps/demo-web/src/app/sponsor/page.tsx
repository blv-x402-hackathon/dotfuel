"use client";

import { useEffect, useRef, useState } from "react";
import { isAddress, getAddress, keccak256, parseEther, stringToHex, hexToBigInt } from "viem";
import { useAccount } from "wagmi";

import { BalancePanel } from "@/components/BalancePanel";
import { CopyableHex } from "@/components/CopyableHex";
import { ErrorNotice } from "@/components/ErrorNotice";
import { FlowResultPanel } from "@/components/FlowResultPanel";
import { InlineProgressStepper } from "@/components/InlineProgressStepper";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ToastContext";
import { useWalletModal } from "@/components/WalletContext";
import { useSponsorModeUserOp } from "@/hooks/useSponsorModeUserOp";
import { EmptyState } from "@/components/EmptyState";
import { createCampaign, fetchCampaignStatus, addRecentCampaign, type CampaignStatus } from "@/lib/campaign-client";
import { CampaignSelector } from "@/components/CampaignSelector";
import { formatAmount } from "@/lib/flowResults";
import { appendTxHistory } from "@/lib/txHistory";
import { toUiError, type UiError } from "@/lib/uiError";

const EMPTY_CAMPAIGN_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";

export default function SponsorPage() {
  const { address, isConnected } = useAccount();
  const { openModal } = useWalletModal();
  const { toast } = useToast();
  const [campaignId, setCampaignId] = useState<`0x${string}`>(
    (process.env.NEXT_PUBLIC_CAMPAIGN_ID as `0x${string}` | undefined) ?? EMPTY_CAMPAIGN_ID
  );
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const hasActiveCampaign = campaignId !== EMPTY_CAMPAIGN_ID;

  // Campaign creation state
  const [name, setName] = useState("DotFuel Launch Day");
  const [budgetPas, setBudgetPas] = useState("0.25");
  const [targets, setTargets] = useState<string[]>(() => {
    const defaultTarget = process.env.NEXT_PUBLIC_DEMO_DAPP_ADDRESS;
    if (!defaultTarget || !isAddress(defaultTarget)) return [];
    return [getAddress(defaultTarget)];
  });
  const [targetDraft, setTargetDraft] = useState("");
  const [perUserMaxOps, setPerUserMaxOps] = useState("3");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<UiError | null>(null);

  // Campaign status
  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusError, setStatusError] = useState<UiError | null>(null);

  // Sponsor execution
  const sponsor = useSponsorModeUserOp(campaignId);

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      if (!campaignId || campaignId === EMPTY_CAMPAIGN_ID) { setStatus(null); return; }
      setIsRefreshing(true);
      setStatusError(null);
      try {
        const nextStatus = await fetchCampaignStatus(campaignId, address);
        if (!cancelled) setStatus(nextStatus);
      } catch (e) {
        if (!cancelled) setStatusError(toUiError(e, "campaign"));
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    }
    loadStatus();
    const interval = window.setInterval(loadStatus, 10_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [address, campaignId]);

  const prevSponsorResultRef = useRef(sponsor.result);
  useEffect(() => {
    const prev = prevSponsorResultRef.current;
    prevSponsorResultRef.current = sponsor.result;
    if (sponsor.result && sponsor.result !== prev) {
      setBalanceRefreshKey((k) => k + 1);
      toast("success", "Sponsored transaction confirmed", `Gas: ${sponsor.result.gasCostLabel} → ${sponsor.result.settlementLabel}`);
      appendTxHistory({
        mode: "sponsor",
        hash: sponsor.result.hash,
        explorerUrl: sponsor.result.explorerUrl,
        gasCostLabel: sponsor.result.gasCostLabel,
        settlementLabel: sponsor.result.settlementLabel,
        createdAt: Date.now()
      });
    }
  }, [sponsor.result, toast]);

  async function handleCreate() {
    setIsSubmitting(true);
    setFormError(null);
    setFeedback(null);
    try {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Campaign name is required");
      const allowedTargets = targets.map((v) => {
        if (!isAddress(v)) throw new Error(`Invalid target: ${v}`);
        return getAddress(v);
      });
      if (allowedTargets.length === 0) throw new Error("At least one allowed target is required");
      const duration = Number(durationMinutes);
      const perUser = Number(perUserMaxOps);
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("Duration must be positive");
      if (!Number.isFinite(perUser) || perUser <= 0) throw new Error("Per-user max ops must be positive");

      const start = Math.floor(Date.now() / 1000);
      const end = start + duration * 60;
      const newId = keccak256(stringToHex(`${trimmedName}:${Date.now()}`));
      const result = await createCampaign({
        campaignId: newId, start, end,
        budget: parseEther(budgetPas),
        allowedTargets,
        perUserMaxOps: perUser
      });
      addRecentCampaign(newId, trimmedName);
      setCampaignId(newId);
      setFeedback(`Campaign created: ${newId.slice(0, 12)}...`);
      toast("success", "Campaign created", `ID: ${newId.slice(0, 16)}...`);
    } catch (e) {
      setFormError(toUiError(e, "campaign"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAddTarget() {
    setFormError(null);
    const value = targetDraft.trim();
    if (!value) return;
    if (!isAddress(value)) { setFormError(toUiError(`Invalid target: ${value}`, "campaign")); return; }
    const normalized = getAddress(value);
    setTargets((current) => (current.includes(normalized) ? current : [...current, normalized]));
    setTargetDraft("");
  }

  const spentBig = status ? hexToBigInt(status.spent) : 0n;
  const budgetBig = status ? hexToBigInt(status.budget) : 0n;
  const spentPct = budgetBig > 0n ? Math.min(100, Number((spentBig * 10000n) / budgetBig) / 100) : 0;
  const budgetBarColor = spentPct >= 90 ? "var(--danger)" : spentPct >= 70 ? "var(--warning)" : "var(--success)";

  if (!isConnected) {
    return (
      <main className="page-shell">
        <h1 className="page-section-title">Sponsor</h1>
        <p className="card-subtitle mt-1-5">Create gas sponsorship campaigns for your users.</p>
        <div className="card card--centered mt-6">
          <EmptyState
            illustration="wallet-required"
            title="Wallet Required"
            description="Connect your wallet to create and manage gas sponsorship campaigns."
          >
            <Button variant="accent" onClick={openModal}>Connect Wallet</Button>
          </EmptyState>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <h1 className="page-section-title">Sponsor</h1>
      <p className="card-subtitle mt-1-5">Create and manage gas sponsorship campaigns.</p>

      <section className="section-grid mt-6">
        <div className="stack sidebar-stack">
          <BalancePanel refreshKey={balanceRefreshKey} />
        </div>
        <div className="stack">
          {/* Campaign ID / Load */}
          <div className="card card--data">
            <h2 className="card-title">Active Campaign</h2>
            <div className="mt-3">
              <CampaignSelector
                value={campaignId}
                onChange={(id) => { setFormError(null); setCampaignId(id); }}
                onError={(msg) => setFormError(toUiError(msg, "campaign"))}
              />
            </div>

            {/* Status */}
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

            {!hasActiveCampaign && !status ? (
              <div className="sponsor-empty-state">
                <EmptyState
                  illustration="empty-campaign"
                  title="No Campaign Loaded"
                  description="Select a recent campaign above or create one below."
                />
              </div>
            ) : (
              <div className="status-grid">
                <article className="status-card">
                  <span className="label">Status</span>
                  <strong>{status ? (status.enabled ? "Enabled" : "Disabled") : "—"}</strong>
                </article>
                <article className="status-card">
                  <span className="label">Budget</span>
                  <strong>{status ? `${formatAmount(budgetBig, 18, 5)} PAS` : "—"}</strong>
                </article>
                <article className="status-card">
                  <span className="label">Remaining</span>
                  <strong>{status ? `${formatAmount(hexToBigInt(status.remainingBudget), 18, 5)} PAS` : "—"}</strong>
                </article>
                <article className="status-card">
                  <span className="label">Ops Used</span>
                  <strong>{typeof status?.userOpsUsed === "number" ? status.userOpsUsed : "—"}</strong>
                </article>
              </div>
            )}

            {statusError ? <ErrorNotice error={statusError} /> : null}
          </div>

          {/* Execute sponsored */}
          {hasActiveCampaign ? (
            <div className="card card--primary">
              <h2 className="card-title">Execute Sponsored Transaction</h2>
              <p className="card-subtitle">
                Campaign: <CopyableHex value={campaignId} />
              </p>
              <div className="button-row mt-4">
                <Button loading={sponsor.isLoading} onClick={sponsor.executeSponsored}>
                  {sponsor.isLoading ? "Submitting..." : "Execute Sponsored"}
                </Button>
              </div>
              <InlineProgressStepper stage={sponsor.progressStage} startedAt={sponsor.progressStartedAt} />
              {sponsor.error ? <ErrorNotice error={sponsor.error} /> : null}
              {sponsor.result ? <FlowResultPanel result={sponsor.result} id="sponsor-flow-result" /> : null}
            </div>
          ) : null}

          {/* Create campaign */}
          <div className="card card--data">
            <h2 className="card-title">Create Campaign</h2>
            <p className="card-subtitle">Set up a new gas sponsorship campaign.</p>
            <div className="form-grid mt-3">
              <label className="field">
                <span className="label">Campaign Name</span>
                <input
                  className={`input ${name.trim() ? "input--valid" : "input--invalid"}`}
                  placeholder="My Campaign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="label">Budget</span>
                <div className="input-suffix-wrap">
                  <input
                    className={`input input--with-suffix ${Number(budgetPas) > 0 ? "input--valid" : "input--invalid"}`}
                    inputMode="decimal"
                    placeholder="0.25"
                    value={budgetPas}
                    onChange={(e) => setBudgetPas(e.target.value)}
                  />
                  <span className="input-suffix">PAS</span>
                </div>
              </label>
              <label className="field">
                <span className="label">Per-User Max Ops</span>
                <input
                  className={`input ${Number(perUserMaxOps) > 0 ? "input--valid" : "input--invalid"}`}
                  inputMode="numeric"
                  placeholder="3"
                  value={perUserMaxOps}
                  onChange={(e) => setPerUserMaxOps(e.target.value)}
                />
              </label>
              <div className="field">
                <span className="label">Duration</span>
                <div className="duration-preset-row">
                  {[["30m", "30"], ["1h", "60"], ["2h", "120"], ["24h", "1440"]].map(([label, val]) => (
                    <button
                      key={val}
                      type="button"
                      className={`button button--sm button--ghost ${durationMinutes === val ? "button--duration-active" : ""}`}
                      onClick={() => setDurationMinutes(val)}
                    >
                      {label}
                    </button>
                  ))}
                  <input
                    className={`input ${Number(durationMinutes) > 0 ? "input--valid" : "input--invalid"}`}
                    inputMode="numeric"
                    placeholder="Custom (min)"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="field mt-3">
              <span className="label">Allowed Targets</span>
              <div className="target-tag-list">
                {targets.length === 0 ? <span className="card-subtitle">Add at least one target address.</span> : null}
                {targets.map((t) => (
                  <span className="target-tag" key={t}>
                    {t.slice(0, 8)}...{t.slice(-4)}
                    <button className="target-tag__remove" onClick={() => setTargets((c) => c.filter((v) => v !== t))} type="button">Remove</button>
                  </span>
                ))}
              </div>
              <div className="target-input-row">
                <input
                  className="input" placeholder="0x..." value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTarget(); } }}
                />
                <Button variant="ghost" onClick={handleAddTarget}>Add</Button>
              </div>
            </div>
            <div className="button-row mt-4">
              <Button variant="accent" loading={isSubmitting} onClick={handleCreate}>
                {isSubmitting ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
            {feedback ? <div className="feedback feedback--success">{feedback}</div> : null}
            {formError ? <ErrorNotice error={formError} /> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
