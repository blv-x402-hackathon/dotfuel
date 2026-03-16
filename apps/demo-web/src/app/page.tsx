import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { FlowTabs } from "@/components/FlowTabs";
import { WalletConnect } from "@/components/WalletConnect";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-eyebrow">Polkadot Hub TestNet • Chain ID 420420417</div>
        <h1 className="hero-title">DotFuel</h1>
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

      <section className="section-grid">
        <div className="stack">
          <WalletConnect />
          <CounterfactualAddress />
        </div>
        <FlowTabs />
      </section>
    </main>
  );
}
