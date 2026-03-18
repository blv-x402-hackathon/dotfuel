"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

import { useCounterfactualAddress } from "@/hooks/useCounterfactualAddress";
import { CopyableHex } from "@/components/CopyableHex";

export function CounterfactualAddress() {
  const { address: eoaAddress } = useAccount();
  const publicClient = usePublicClient();
  const { address, status, error } = useCounterfactualAddress();
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!address || !publicClient) {
      setIsDeployed(null);
      return;
    }

    let cancelled = false;
    publicClient.getBytecode({ address }).then((code) => {
      if (!cancelled) {
        setIsDeployed(Boolean(code && code !== "0x"));
      }
    }).catch(() => {
      if (!cancelled) setIsDeployed(null);
    });

    return () => { cancelled = true; };
  }, [address, publicClient]);

  const isConnected = Boolean(eoaAddress);

  return (
    <section className="card card--info">
      <h2 className="card-title">Smart Account</h2>
      <p className="card-subtitle">Counterfactual address derived from the GasStationFactory on sender salt `0`.</p>
      <div className="address-line" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <span className="label">Counterfactual Address</span>
          {address ? (
            <span className={`badge ${isDeployed ? "badge--success" : "badge--neutral"}`}>
              {isDeployed === null ? "Checking..." : isDeployed ? "Deployed ✓" : "Not deployed"}
            </span>
          ) : null}
        </div>
        {!isConnected ? (
          <span className="value value--muted">Connect wallet to derive</span>
        ) : status === "loading" ? (
          <span className="value value--muted">Deriving...</span>
        ) : error ? (
          <span className="value value--danger">{error}</span>
        ) : address ? (
          <CopyableHex value={address} />
        ) : null}
      </div>
    </section>
  );
}
