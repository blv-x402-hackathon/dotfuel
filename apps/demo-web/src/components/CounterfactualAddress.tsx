"use client";

import { useCounterfactualAddress } from "@/hooks/useCounterfactualAddress";
import { CopyableHex } from "@/components/CopyableHex";

export function CounterfactualAddress() {
  const { address, status, error } = useCounterfactualAddress();
  const counterfactual = address ?? (status === "loading" ? "Deriving..." : error ?? "-");

  return (
    <section className="card card--info">
      <h2 className="card-title">Smart Account</h2>
      <p className="card-subtitle">Counterfactual address derived from the GasStationFactory on sender salt `0`.</p>
      <div className="address-line" style={{ marginTop: 16 }}>
        <span className="label">Counterfactual Address</span>
        {counterfactual.startsWith("0x")
          ? <CopyableHex value={counterfactual} />
          : <span className="value value--danger">{counterfactual}</span>}
      </div>
    </section>
  );
}
