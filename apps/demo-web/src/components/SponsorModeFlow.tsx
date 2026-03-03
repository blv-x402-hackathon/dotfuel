"use client";

import { useEffect } from "react";

import type { FlowResult } from "@/components/TokenModeFlow";
import { useSponsorModeUserOp } from "@/hooks/useSponsorModeUserOp";

export function SponsorModeFlow({ onTx }: { onTx: (result: FlowResult) => void }) {
  const { executeSponsored, isLoading, error, result } = useSponsorModeUserOp();

  useEffect(() => {
    if (!result) return;
    onTx({ mode: "sponsor", hash: result.txHash ?? result.userOpHash, explorerUrl: result.explorerUrl });
  }, [result, onTx]);

  return (
    <section style={{ padding: 16, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <h2 style={{ marginTop: 0 }}>Flow B — Sponsor Mode</h2>
      <button disabled={isLoading} onClick={executeSponsored}>
        {isLoading ? "Submitting..." : "Execute Sponsored"}
      </button>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      {result ? (
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div>Gas: Sponsored by campaign</div>
          <div>UserOp: {result.userOpHash}</div>
          {result.explorerUrl ? (
            <a href={result.explorerUrl} target="_blank" rel="noreferrer">
              Blockscout Tx
            </a>
          ) : (
            <div>Waiting for bundler receipt...</div>
          )}
        </div>
      ) : null}
    </section>
  );
}
