"use client";

import { useEffect } from "react";

import { CopyableHex } from "@/components/CopyableHex";
import { ErrorNotice } from "@/components/ErrorNotice";
import { InlineProgressStepper } from "@/components/InlineProgressStepper";
import { useSponsorModeUserOp } from "@/hooks/useSponsorModeUserOp";
import type { FlowResult } from "@/lib/flowResults";

export function SponsorModeFlow({
  campaignId,
  onTx,
  onFlowError,
  walletRequired = false
}: {
  campaignId: `0x${string}`;
  onTx: (result: FlowResult) => void;
  onFlowError?: (message: string) => void;
  walletRequired?: boolean;
}) {
  const { executeSponsored, isLoading, error, result, progressStage, progressStartedAt } = useSponsorModeUserOp(campaignId);

  useEffect(() => {
    if (!result) return;
    onTx(result);
  }, [onTx, result]);

  useEffect(() => {
    if (!error) return;
    onFlowError?.(error.message);
  }, [error, onFlowError]);

  return (
    <section className="card card--primary" id="sponsor-flow">
      <h2 className="card-title">Flow B — Sponsor Mode</h2>
      <p className="card-subtitle">
        Use the active campaign budget to sponsor the same DemoDapp action without token spend. Active ID:
        {" "}
        <CopyableHex value={campaignId} />
      </p>
      <div className="button-row" style={{ marginTop: 16 }}>
        <button
          className="button"
          disabled={isLoading || walletRequired}
          onClick={executeSponsored}
          title={walletRequired ? "Wallet required" : undefined}
        >
        {isLoading ? "Submitting..." : "Execute Sponsored"}
        </button>
      </div>
      {walletRequired ? <p className="card-subtitle" style={{ marginTop: 10 }}>Connect wallet first.</p> : null}
      <InlineProgressStepper stage={progressStage} startedAt={progressStartedAt} />

      {error ? <ErrorNotice error={error} /> : null}

      {result ? (
        <div className="result-panel result-panel--success" id="sponsor-flow-result">
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
            <div className="result-meta__line">
              <span>UserOp:</span>
              <CopyableHex value={result.userOpHash} />
            </div>
            <div className="result-meta__line">
              <span>Tx:</span>
              {result.txHash
                ? <CopyableHex value={result.txHash} href={result.explorerUrl} />
                : "Waiting for bundler receipt..."}
            </div>
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
