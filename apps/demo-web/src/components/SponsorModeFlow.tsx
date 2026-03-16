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
    <section className="card">
      <h2 className="card-title">Flow B — Sponsor Mode</h2>
      <p className="card-subtitle">Use a live campaign budget to sponsor the same DemoDapp action without token spend.</p>
      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="button" disabled={isLoading} onClick={executeSponsored}>
        {isLoading ? "Submitting..." : "Execute Sponsored"}
        </button>
      </div>

      {error ? <div className="feedback">{error}</div> : null}

      {result ? (
        <div className="feedback feedback--success">
          <div>Gas: Sponsored by campaign</div>
          <div>UserOp: {result.userOpHash}</div>
          {result.explorerUrl ? (
            <a className="inline-link" href={result.explorerUrl} target="_blank" rel="noreferrer">
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
