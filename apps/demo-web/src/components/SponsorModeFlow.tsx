"use client";

import { useEffect } from "react";

import { CopyableHex } from "@/components/CopyableHex";
import { ErrorNotice } from "@/components/ErrorNotice";
import { FlowResultPanel } from "@/components/FlowResultPanel";
import { InlineProgressStepper } from "@/components/InlineProgressStepper";
import { Button } from "@/components/ui/Button";
import { useSponsorModeUserOp } from "@/hooks/useSponsorModeUserOp";
import type { FlowResult } from "@/lib/flowResults";

export function SponsorModeFlow({
  campaignId,
  onTx,
  onFlowError,
  onLoadingChange,
  walletRequired = false
}: {
  campaignId: `0x${string}`;
  onTx: (result: FlowResult) => void;
  onFlowError?: (message: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
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

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  return (
    <section className="card card--primary" id="sponsor-flow">
      <h2 className="card-title">Sponsored Transaction</h2>
      <p className="card-subtitle">
        Execute a transaction sponsored by the active campaign budget. Campaign:
        {" "}
        <CopyableHex value={campaignId} />
      </p>
      <div className="button-row" style={{ marginTop: 16 }}>
        <Button
          loading={isLoading}
          disabled={walletRequired}
          onClick={executeSponsored}
          title={walletRequired ? "Wallet required" : undefined}
        >
          {isLoading ? "Submitting..." : "Execute Sponsored"}
        </Button>
      </div>
      {walletRequired ? <p className="card-subtitle" style={{ marginTop: 10 }}>Connect wallet first.</p> : null}
      <InlineProgressStepper stage={progressStage} startedAt={progressStartedAt} />

      {error ? <ErrorNotice error={error} /> : null}

      {result ? <FlowResultPanel result={result} id="sponsor-flow-result" /> : null}
    </section>
  );
}
