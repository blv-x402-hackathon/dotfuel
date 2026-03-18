"use client";

import { useState } from "react";
import Link from "next/link";

import { BalancePanel } from "@/components/BalancePanel";
import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { Button } from "@/components/ui/Button";
import { TxHistory, type TxHistoryItem } from "@/components/TxHistory";
import { useWalletModal } from "@/components/WalletContext";
import { useAccount } from "wagmi";

export default function HomePage() {
  const { isConnected } = useAccount();
  const { openModal } = useWalletModal();
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
          <p className="hero-copy">Pay blockchain gas with any token. Zero native balance required.</p>
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

        <div className="hero-grid hero-grid--two" style={{ marginTop: 18 }}>
          <div className="card">
            <h3 className="card-title">Pay with Token</h3>
            <p className="card-subtitle">Use any supported ERC-20 token to pay for gas. No native balance needed.</p>
          </div>
          <div className="card">
            <h3 className="card-title">Sponsored Gas</h3>
            <p className="card-subtitle">dApps can sponsor gas for their users through onboarding campaigns.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero" style={{ padding: 24 }}>
        <h1 className="hero-title" style={{ fontSize: "var(--text-2xl)", marginBottom: 8 }}>Dashboard</h1>
        <p className="hero-copy">Welcome back. Here's your account overview.</p>
      </section>

      <section className="section-grid" style={{ marginTop: 18 }}>
        <div className="stack sidebar-stack">
          <CounterfactualAddress />
        </div>
        <div className="stack">
          <BalancePanel refreshKey={0} />

          <div className="card">
            <h3 className="card-title">Quick Actions</h3>
            <div className="button-row" style={{ marginTop: 12 }}>
              <Link href="/send" className="button button--accent" style={{ textDecoration: "none" }}>
                Pay with Token
              </Link>
              <Link href="/sponsor" className="button button--ghost" style={{ textDecoration: "none" }}>
                Create Campaign
              </Link>
            </div>
          </div>

          {history.length > 0 ? (
            <div>
              <TxHistory items={history} />
              <div style={{ marginTop: 12, textAlign: "center" }}>
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
