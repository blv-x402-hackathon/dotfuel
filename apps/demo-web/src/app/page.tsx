"use client";

import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { FlowTabs } from "@/components/FlowTabs";
import { LogoMark } from "@/components/LogoMark";
import { WalletConnect } from "@/components/WalletConnect";
import { useAccount } from "wagmi";

export default function HomePage() {
  const { isConnected } = useAccount();

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-brand">
          <LogoMark className="hero-logo" />
          <div className="hero-brand-copy">
            <div className="hero-eyebrow">Polkadot Hub TestNet • Chain ID 420420417</div>
            <h1 className="hero-title">DotFuel</h1>
          </div>
        </div>
        <p className="hero-copy">
          Show the exact hackathon moment that matters: a wallet holding zero native gas still lands a UserOperation,
          settles in token mode, or rides a sponsor campaign without friction.
        </p>
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">Primary Claim</span>
            <span className="stat-value">0 PAS</span>
          </div>
          <div className="stat">
            <span className="stat-label">Settlement</span>
            <span className="stat-value">Permit2</span>
          </div>
          <div className="stat">
            <span className="stat-label">Modes</span>
            <span className="stat-value">Token + Sponsor</span>
          </div>
        </div>
      </section>

      {!isConnected ? <WalletConnect variant="hero" /> : null}

      <section className="section-grid">
        <div className="stack">
          {isConnected ? <WalletConnect variant="sidebar" /> : null}
          <CounterfactualAddress />
        </div>
        <FlowTabs />
      </section>
    </main>
  );
}
