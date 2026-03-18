"use client";

import { useEffect } from "react";

import { CopyableHex } from "@/components/CopyableHex";
import { ErrorNotice } from "@/components/ErrorNotice";
import { InlineProgressStepper } from "@/components/InlineProgressStepper";
import { type FlowResult } from "@/lib/flowResults";
import { useTokenModeUserOp } from "@/hooks/useTokenModeUserOp";

export function TokenModeFlow({
  onTx,
  onFlowError,
  walletRequired = false
}: {
  onTx: (result: FlowResult) => void;
  onFlowError?: (message: string) => void;
  walletRequired?: boolean;
}) {
  const { executeTokenMode, isLoading, error, result, progressStage, progressStartedAt } = useTokenModeUserOp();

  useEffect(() => {
    if (!result) return;
    onTx(result);
  }, [result, onTx]);

  useEffect(() => {
    if (!error) return;
    onFlowError?.(error.message);
  }, [error, onFlowError]);

  return (
    <section className="card card--primary" id="token-flow">
      <h2 className="card-title">Flow A — Token Mode</h2>
      <p className="card-subtitle">Approve Permit2, call DemoDapp, and settle gas in tUSDT with zero PAS on hand.</p>
      <div className="button-row" style={{ marginTop: 16 }}>
        <button
          className="button button--accent"
          disabled={isLoading || walletRequired}
          onClick={executeTokenMode}
          title={walletRequired ? "Wallet required" : undefined}
        >
        {isLoading ? "Submitting..." : "Pay gas in tUSDT"}
        </button>
      </div>
      {walletRequired ? <p className="card-subtitle" style={{ marginTop: 10 }}>Connect wallet first.</p> : null}
      <InlineProgressStepper stage={progressStage} startedAt={progressStartedAt} />

      {error ? <ErrorNotice error={error} /> : null}

      {result ? (
        <div className="result-panel result-panel--success" id="token-flow-result">
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
              <li
                className={`timeline-item timeline-item--${step.status}`}
                key={`${step.title}-${index}`}
                style={{ animationDelay: `${index * 55}ms` }}
              >
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
