"use client";

import { useEffect } from "react";

import { useTokenModeUserOp } from "@/hooks/useTokenModeUserOp";

export interface FlowResult {
  hash?: string;
  explorerUrl?: string;
  mode: "token" | "sponsor";
}

export function TokenModeFlow({ onTx }: { onTx: (result: FlowResult) => void }) {
  const { executeTokenMode, isLoading, error, result } = useTokenModeUserOp();

  useEffect(() => {
    if (!result) return;
    onTx({ mode: "token", hash: result.txHash ?? result.userOpHash, explorerUrl: result.explorerUrl });
  }, [result, onTx]);

  return (
    <section className="card">
      <h2 className="card-title">Flow A — Token Mode</h2>
      <p className="card-subtitle">Approve Permit2, call DemoDapp, and settle gas in tUSDT with zero PAS on hand.</p>
      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="button button--accent" disabled={isLoading} onClick={executeTokenMode}>
        {isLoading ? "Submitting..." : "Pay gas in tUSDT"}
        </button>
      </div>

      {error ? <div className="feedback">{error}</div> : null}

      {result ? (
        <div className="feedback feedback--success">
          <div>Gas cost: 0 PAS</div>
          <div>Paid: check TokenGasPaid event on explorer</div>
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
