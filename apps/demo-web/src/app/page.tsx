import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { WalletConnect } from "@/components/WalletConnect";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px", display: "grid", gap: 20 }}>
      <h1 style={{ margin: 0 }}>DotFuel — Pay gas with any token</h1>
      <p style={{ margin: 0, color: "#334155" }}>
        Polkadot Hub TestNet (Chain ID: 420420417)
      </p>
      <section style={{ padding: 16, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <WalletConnect />
      </section>
      <section style={{ padding: 16, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <CounterfactualAddress />
      </section>
    </main>
  );
}
