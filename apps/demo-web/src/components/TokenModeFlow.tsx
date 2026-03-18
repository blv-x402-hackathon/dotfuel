"use client";

import { useEffect } from "react";

import { ErrorNotice } from "@/components/ErrorNotice";
import { FlowResultPanel } from "@/components/FlowResultPanel";
import { InlineProgressStepper } from "@/components/InlineProgressStepper";
import { Button } from "@/components/ui/Button";
import { type FlowResult } from "@/lib/flowResults";
import { useTokenModeUserOp } from "@/hooks/useTokenModeUserOp";

export function TokenModeFlow({
  onTx,
  onFlowError,
  onLoadingChange,
  walletRequired = false
}: {
  onTx: (result: FlowResult) => void;
  onFlowError?: (message: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
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

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  return (
    <section className="card card--primary" id="token-flow">
      <h2 className="card-title">Pay with Token</h2>
      <p className="card-subtitle">Send a gasless transaction and settle the gas fee in tUSDT via Permit2.</p>
      <div className="button-row mt-4">
        <Button
          variant="accent"
          loading={isLoading}
          disabled={walletRequired}
          onClick={executeTokenMode}
          title={walletRequired ? "Wallet required" : undefined}
        >
          {isLoading ? "Submitting..." : "Pay gas in tUSDT"}
        </Button>
      </div>
      {walletRequired ? <p className="card-subtitle mt-3">Connect wallet first.</p> : null}
      <InlineProgressStepper stage={progressStage} startedAt={progressStartedAt} />

      {error ? <ErrorNotice error={error} /> : null}

      {result ? <FlowResultPanel result={result} id="token-flow-result" /> : null}
    </section>
  );
}
