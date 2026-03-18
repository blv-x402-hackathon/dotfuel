"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

import { useCounterfactualAddress } from "@/hooks/useCounterfactualAddress";
import { CopyableHex } from "@/components/CopyableHex";
import { Skeleton } from "@/components/ui/Skeleton";

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
      <p className="card-subtitle">Your smart account address, derived deterministically from your wallet.</p>
      <div className="address-line mt-4">
        <div className="address-line__header">
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
          <Skeleton height={20} width="80%" variant="rect" />
        ) : error ? (
          <span className="value value--danger">{error}</span>
        ) : address ? (
          <CopyableHex value={address} />
        ) : null}
      </div>
    </section>
  );
}
