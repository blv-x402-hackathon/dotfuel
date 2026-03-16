"use client";

import { useEffect } from "react";

import { ErrorNotice } from "@/components/ErrorNotice";
import { useSponsorModeUserOp } from "@/hooks/useSponsorModeUserOp";
import type { FlowResult } from "@/lib/flowResults";

export function SponsorModeFlow({ campaignId, onTx }: { campaignId: `0x${string}`; onTx: (result: FlowResult) => void }) {
  const { executeSponsored, isLoading, error, result } = useSponsorModeUserOp(campaignId);

  useEffect(() => {
    if (!result) return;
    onTx(result);
  }, [onTx, result]);

  return (
    <section className="card">
      <h2 className="card-title">Flow B — Sponsor Mode</h2>
      <p className="card-subtitle">
        Use the active campaign budget to sponsor the same DemoDapp action without token spend. Active ID:
        {" "}
        {campaignId.slice(0, 12)}...
      </p>
      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="button" disabled={isLoading} onClick={executeSponsored}>
        {isLoading ? "Submitting..." : "Execute Sponsored"}
        </button>
      </div>

      {error ? <ErrorNotice error={error} /> : null}

      {result ? (
        <div className="result-panel result-panel--success">
          <div className="result-grid">
            <div className="result-metric">
              <span className="label">Gas Cost</span>
              <strong>{result.gasCostLabel}</strong>
            </div>
            <div className="result-metric">
              <span className="label">Settlement</span>
              <strong>{result.settlementLabel}</strong>
            </div>
          </div>
          <div className="result-meta">
            <div>UserOp: {result.userOpHash}</div>
            <div>Tx: {result.txHash ?? "Waiting for bundler receipt..."}</div>
          </div>
          <ol className="timeline-list">
            {result.timeline.map((step, index) => (
              <li className={`timeline-item timeline-item--${step.status}`} key={`${step.title}-${index}`}>
                <div className="timeline-item__title">
                  {index + 1}. {step.title}
                </div>
                <div className="timeline-item__detail">{step.detail}</div>
              </li>
            ))}
          </ol>
          {result.explorerUrl ? (
            <a className="inline-link" href={result.explorerUrl} target="_blank" rel="noreferrer">
              Open Blockscout
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
