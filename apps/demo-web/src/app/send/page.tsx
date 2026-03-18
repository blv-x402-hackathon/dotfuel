"use client";

import { useState } from "react";

import { BalancePanel } from "@/components/BalancePanel";
import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { FlowResultPanel } from "@/components/FlowResultPanel";
import { ErrorNotice } from "@/components/ErrorNotice";
import { InlineProgressStepper } from "@/components/InlineProgressStepper";
import { Button } from "@/components/ui/Button";
import { useWalletModal } from "@/components/WalletContext";
import { useTokenModeUserOp } from "@/hooks/useTokenModeUserOp";
import type { FlowResult } from "@/lib/flowResults";
import { useAccount } from "wagmi";

export default function SendPage() {
  const { isConnected } = useAccount();
  const { openModal } = useWalletModal();
  const { executeTokenMode, isLoading, error, result, progressStage, progressStartedAt } = useTokenModeUserOp();
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [lastResult, setLastResult] = useState<FlowResult | null>(null);

  function handleExecute() {
    executeTokenMode();
  }

  if (result && result !== lastResult) {
    setLastResult(result);
    setBalanceRefreshKey((k) => k + 1);
  }

  return (
    <main className="page-shell">
      <section className="hero" style={{ padding: 24 }}>
        <h1 className="hero-title" style={{ fontSize: "var(--text-2xl)", marginBottom: 8 }}>Pay with Token</h1>
        <p className="hero-copy">Send a gasless transaction and settle gas in tUSDT via Permit2.</p>
      </section>

      {!isConnected ? (
        <section className="card" style={{ marginTop: 18, textAlign: "center", padding: 32 }}>
          <h2 className="card-title">Wallet Required</h2>
          <p className="card-subtitle">Connect your wallet to send gasless transactions.</p>
          <div className="button-row" style={{ marginTop: 16, justifyContent: "center" }}>
            <Button variant="accent" onClick={openModal}>Connect Wallet</Button>
          </div>
        </section>
      ) : (
        <section className="section-grid" style={{ marginTop: 18 }}>
          <div className="stack sidebar-stack">
            <CounterfactualAddress />
            <BalancePanel refreshKey={balanceRefreshKey} />
          </div>
          <div className="stack">
            <div className="card card--primary">
              <h2 className="card-title">Execute Transaction</h2>
              <p className="card-subtitle">
                Your smart account will approve Permit2, call the target contract, and settle gas in tUSDT — all in a single transaction.
              </p>
              <div className="button-row" style={{ marginTop: 16 }}>
                <Button variant="accent" loading={isLoading} onClick={handleExecute}>
                  {isLoading ? "Submitting..." : "Pay gas in tUSDT"}
                </Button>
              </div>
              <InlineProgressStepper stage={progressStage} startedAt={progressStartedAt} />
              {error ? <ErrorNotice error={error} /> : null}
              {result ? <FlowResultPanel result={result} id="token-flow-result" /> : null}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
