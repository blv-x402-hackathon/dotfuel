"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";

import { BalancePanel } from "@/components/BalancePanel";
import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { Button } from "@/components/ui/Button";
import { TxHistory, type TxHistoryItem } from "@/components/TxHistory";
import { useWalletModal } from "@/components/WalletContext";
import { useCounterfactualAddress } from "@/hooks/useCounterfactualAddress";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { getRecentCampaigns } from "@/lib/campaign-client";
import { loadTxHistory } from "@/lib/txHistory";

// Contextual hints shown based on user state
type HintKind = "deploy" | "last-failed" | "campaign";
interface SmartHint {
  kind: HintKind;
  message: string;
  action: { label: string; href?: string; onClick?: () => void };
}

function useSmartHints() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { address: smartAccountAddress } = useCounterfactualAddress();
  const [hints, setHints] = useState<SmartHint[]>([]);

  useEffect(() => {
    if (!address || !publicClient) { setHints([]); return; }
    const next: SmartHint[] = [];

    // Last tx failed?
    const history = loadTxHistory();
    if (history.length > 0 && !history[0].explorerUrl) {
      next.push({
        kind: "last-failed",
        message: "Your last transaction may have failed or is still pending.",
        action: { label: "View History", href: "/history" }
      });
    }

    // Recent campaign exists?
    const recentCampaigns = getRecentCampaigns();
    if (recentCampaigns.length > 0) {
      next.push({
        kind: "campaign",
        message: `Active campaign: ${recentCampaigns[0].name}`,
        action: { label: "Manage →", href: "/sponsor" }
      });
    }

    setHints(next);

    // Check account deployment status async
    if (smartAccountAddress) {
      publicClient.getCode({ address: smartAccountAddress }).then((code) => {
        if (!code || code === "0x") {
          setHints((prev) => [
            {
              kind: "deploy",
              message: "Your smart account is not yet deployed. Send a transaction to deploy it.",
              action: { label: "Send Transaction →", href: "/send" }
            },
            ...prev.filter((h) => h.kind !== "deploy")
          ]);
        }
      }).catch(() => {});
    }
  }, [address, publicClient, smartAccountAddress]);

  return hints;
}

export default function HomePage() {
  const { isConnected } = useAccount();
  const { openModal } = useWalletModal();
  const hints = useSmartHints();
  const [balanceKey, setBalanceKey] = useState(0);
  const { progress: pullProgress, refreshing: pullRefreshing } = usePullToRefresh({
    onRefresh: () => setBalanceKey((k) => k + 1)
  });
  const [history] = useState<TxHistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("dotfuel-tx-history");
      return raw ? JSON.parse(raw).slice(0, 3) : [];
    } catch {
      return [];
    }
  });

  if (!isConnected) {
    return (
      <main className="page-shell">
        <section className="hero">
          <h1 className="hero-title">DotFuel</h1>
          <p className="hero-copy">
            Execute Polkadot Hub transactions with <strong>zero PAS</strong>. Pay gas in tUSDT or any supported token — no native balance required.
          </p>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-label">Gas Required</span>
              <span className="stat-value stat-value--live">0 PAS</span>
            </div>
            <div className="stat">
              <span className="stat-label">Payment Modes</span>
              <span className="stat-value">2</span>
              <span className="stat-sublabel">Token + Sponsor</span>
            </div>
            <div className="stat">
              <span className="stat-label">Settlement</span>
              <span className="stat-value stat-value--text">Permit2</span>
            </div>
          </div>
          <div className="hero-cta-row">
            <Button variant="accent" size="lg" onClick={openModal}>
              Connect Wallet to Start
            </Button>
          </div>
        </section>

        {/* How it works — 3 steps */}
        <section className="how-it-works mt-6">
          <h2 className="how-it-works__title">How it works</h2>
          <ol className="how-it-works__steps" aria-label="How DotFuel works">
            <li className="how-it-works__step">
              <div className="how-it-works__icon" aria-hidden>
                <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
                  <circle cx="16" cy="16" r="14" stroke="var(--accent)" strokeWidth="1.5" />
                  <path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="16" cy="16" r="2.5" fill="var(--accent)" />
                </svg>
              </div>
              <div className="how-it-works__text">
                <strong>Connect your wallet</strong>
                <span>DotFuel derives a smart account address — no deployment needed upfront.</span>
              </div>
            </li>
            <li className="how-it-works__step">
              <div className="how-it-works__icon" aria-hidden>
                <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
                  <rect x="3" y="7" width="26" height="18" rx="5" stroke="var(--accent)" strokeWidth="1.5" />
                  <path d="M3 13h26" stroke="var(--accent)" strokeWidth="1.5" />
                  <circle cx="9" cy="19" r="2" fill="var(--accent)" />
                </svg>
              </div>
              <div className="how-it-works__text">
                <strong>Choose a payment token</strong>
                <span>Select tUSDT or any supported Asset Hub token to settle gas fees.</span>
              </div>
            </li>
            <li className="how-it-works__step">
              <div className="how-it-works__icon" aria-hidden>
                <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
                  <path d="M6 16h14M16 10l6 6-6 6" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M26 8v16" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                </svg>
              </div>
              <div className="how-it-works__text">
                <strong>Send transactions — gas settled in your token</strong>
                <span>Sign once with Permit2. Gas is deducted in your chosen token, never PAS.</span>
              </div>
            </li>
          </ol>
        </section>

        <div className="hero-grid hero-grid--two hero-grid--sm mt-4">
          <div className="card">
            <h3 className="card-title">Pay with Token</h3>
            <p className="card-subtitle mt-2">Use any supported ERC-20 token to pay for gas. No native balance needed.</p>
          </div>
          <div className="card">
            <h3 className="card-title">Sponsored Gas</h3>
            <p className="card-subtitle mt-2">dApps can sponsor gas for their users through onboarding campaigns.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      {/* Pull-to-refresh indicator */}
      {(pullProgress > 0 || pullRefreshing) ? (
        <div
          className="pull-indicator"
          aria-live="polite"
          aria-label={pullRefreshing ? "Refreshing…" : "Pull to refresh"}
          style={{ opacity: pullRefreshing ? 1 : pullProgress }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            width="20"
            height="20"
            aria-hidden
            style={{
              animation: pullRefreshing ? "spinForever 700ms linear infinite" : "none",
              transform: pullRefreshing ? undefined : `rotate(${pullProgress * 360}deg)`
            }}
          >
            <path d="M12 4a8 8 0 1 0 8 8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 4v4h-4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{pullRefreshing ? "Refreshing…" : "Release to refresh"}</span>
        </div>
      ) : null}

      <section className="hero hero--compact">
        <h1 className="hero-title">Dashboard</h1>
        <p className="hero-copy">Welcome back. Here&apos;s your account overview.</p>
      </section>

      <section className="section-grid">
        <div className="stack sidebar-stack">
          <CounterfactualAddress />
        </div>
        <div className="stack">
          <BalancePanel refreshKey={balanceKey} />

          <div className="card">
            <h3 className="card-title">Quick Actions</h3>
            {hints.length > 0 ? (
              <ul className="smart-hints" aria-label="Contextual recommendations">
                {hints.map((hint) => (
                  <li key={hint.kind} className={`smart-hint smart-hint--${hint.kind}`}>
                    <span className="smart-hint__msg">{hint.message}</span>
                    {hint.action.href ? (
                      <Link href={hint.action.href} className="smart-hint__action">{hint.action.label}</Link>
                    ) : (
                      <button className="smart-hint__action" type="button" onClick={hint.action.onClick}>{hint.action.label}</button>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="button-row mt-3">
              <Link href="/send" className="button button--accent">
                Pay with Token
              </Link>
              <Link href="/sponsor" className="button button--ghost">
                Create Campaign
              </Link>
            </div>
          </div>

          {history.length > 0 ? (
            <div>
              <TxHistory items={history} />
              <div className="mt-3 text-center">
                <Link href="/history" className="inline-link">
                  View all transactions
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
