"use client";

import { useTokenModeUserOp } from "@/hooks/useTokenModeUserOp";

export function TokenModeFlow() {
  const { executeTokenMode, isLoading, error, result } = useTokenModeUserOp();

  return (
    <section style={{ padding: 16, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <h2 style={{ marginTop: 0 }}>Flow A — Token Mode (0 PAS)</h2>
      <button disabled={isLoading} onClick={executeTokenMode}>
        {isLoading ? "Submitting..." : "Pay gas in tUSDT"}
      </button>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      {result ? (
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div>Gas cost: 0 PAS</div>
          <div>Paid: check TokenGasPaid event on explorer</div>
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
