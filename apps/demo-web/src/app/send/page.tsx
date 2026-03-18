"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/Button";
import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { ErrorNotice } from "@/components/ErrorNotice";
import { FlowResultPanel } from "@/components/FlowResultPanel";
import { InlineProgressStepper } from "@/components/InlineProgressStepper";
import { useToast } from "@/components/ToastContext";
import { useWalletModal } from "@/components/WalletContext";
import { useSendWizard, type SendStep } from "@/hooks/useSendWizard";
import { formatAmount } from "@/lib/flowResults";

const WIZARD_STEPS = [
  { label: "Configure" },
  { label: "Review & Sign" },
  { label: "Execute" }
] as const;

function stepIndex(step: SendStep): 0 | 1 | 2 {
  if (step === "configure") return 0;
  if (step === "review") return 1;
  return 2;
}

function WizardStepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="wizard-indicator" role="list" aria-label="Transaction steps">
      {WIZARD_STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <div key={s.label} className={`wizard-indicator__step wizard-indicator__step--${state}`} role="listitem">
            <span className="wizard-indicator__num" aria-hidden>
              {state === "done" ? "✓" : i + 1}
            </span>
            <span className="wizard-indicator__label">{s.label}</span>
            {i < 2 && <span className="wizard-indicator__line" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}

export default function SendPage() {
  const { isConnected } = useAccount();
  const { openModal } = useWalletModal();
  const { toast } = useToast();
  const {
    step, isFetchingQuote, isSigningPermit2, quoteCtx, result, error,
    progressStage, progressStartedAt,
    fetchQuote, signPermit2, executeUserOp, reset
  } = useSendWizard();

  const prevStepRef = useRef(step);
  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;
    if (step === "execute") {
      executeUserOp();
    } else if (step === "success" && prev === "execute" && result) {
      toast("success", "Transaction confirmed", `Gas: ${result.gasCostLabel} → ${result.settlementLabel}`);
    } else if (step === "failed" && prev === "execute" && error) {
      toast("error", "Transaction failed", error.message);
    }
  }, [step, executeUserOp, result, error, toast]);

  if (!isConnected) {
    return (
      <main className="page-shell">
        <h1 className="page-section-title">Pay with Token</h1>
        <p className="card-subtitle" style={{ marginTop: 6 }}>
          Send a gasless transaction and settle gas in tUSDT via Permit2.
        </p>
        <div className="card" style={{ marginTop: 24, textAlign: "center", padding: 40 }}>
          <div className="empty-state">
            <svg className="empty-state__icon" viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="20" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 3" />
              <path d="M16 24h16M24 16v16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <strong>Wallet Required</strong>
            <p>Connect your wallet to send gasless transactions.</p>
            <Button variant="accent" onClick={openModal}>Connect Wallet</Button>
          </div>
        </div>
      </main>
    );
  }

  const currentStep = stepIndex(step);

  return (
    <main className="page-shell">
      <h1 className="page-section-title">Pay with Token</h1>
      <p className="card-subtitle" style={{ marginTop: 6 }}>
        Send a gasless transaction and settle gas in tUSDT via Permit2.
      </p>

      <div className="section-grid" style={{ marginTop: 24 }}>
        <div className="stack sidebar-stack">
          <CounterfactualAddress />
        </div>

        <div className="stack">
          <WizardStepIndicator current={currentStep} />

          {/* Step 1: Configure */}
          {(step === "configure" || isFetchingQuote) && (
            <div className="card card--primary">
              <h2 className="card-title">Configure Transaction</h2>
              <div className="wizard-field-group">
                <div className="wizard-field">
                  <span className="label">Payment Token</span>
                  <div className="token-chip">
                    <span className="token-chip__symbol">$</span>
                    <span className="token-chip__name">tUSDT</span>
                    <span className="badge badge--accent" style={{ marginLeft: "auto" }}>Active</span>
                  </div>
                </div>

                <div className="wizard-field">
                  <span className="label">Target Contract</span>
                  <div className="wizard-action-row">
                    <span className="wizard-action__name">DemoDapp</span>
                    <span className="wizard-action__detail">execute("Hello DotFuel!")</span>
                  </div>
                </div>

                <div className="wizard-field">
                  <span className="label">What happens</span>
                  <ol className="wizard-step-list">
                    <li>Your smart account approves Permit2 to spend tUSDT</li>
                    <li>DemoDapp is called with your message</li>
                    <li>Gas is settled in tUSDT — 0 native token required</li>
                  </ol>
                </div>
              </div>

              {error ? <ErrorNotice error={error} /> : null}

              <div className="button-row" style={{ marginTop: 20 }}>
                <Button variant="accent" loading={isFetchingQuote} onClick={fetchQuote}>
                  {isFetchingQuote ? "Fetching quote..." : "Get Quote →"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Review & Sign */}
          {step === "review" && quoteCtx ? (
            <div className="card card--primary">
              <h2 className="card-title">Review & Sign</h2>
              <p className="card-subtitle">
                You&apos;ll sign a Permit2 approval so the paymaster can collect the exact gas cost in{" "}
                {quoteCtx.tokenSymbol} after your transaction confirms.
              </p>

              <div className="review-grid">
                <div className="review-item">
                  <span className="label">Estimated Cost</span>
                  <strong className="review-item__value--accent">
                    ≤ {formatAmount(quoteCtx.maxTokenCharge, quoteCtx.tokenDecimals, 4)}{" "}
                    {quoteCtx.tokenSymbol}
                  </strong>
                </div>
                <div className="review-item">
                  <span className="label">Payment Method</span>
                  <strong>{quoteCtx.tokenSymbol} via Permit2</strong>
                </div>
                <div className="review-item">
                  <span className="label">Account Setup</span>
                  <strong>{quoteCtx.requiresDeployment ? "Deploy + Execute" : "Execute only"}</strong>
                </div>
                <div className="review-item">
                  <span className="label">Native Gas (PAS)</span>
                  <strong className="review-item__value--success">0 PAS required</strong>
                </div>
              </div>

              <div className="review-notice">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden style={{ flex: "none" }}>
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 5.5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span>
                  Only the actual gas cost will be charged — never more than the estimate above.
                </span>
              </div>

              {error ? <ErrorNotice error={error} /> : null}

              <div className="button-row" style={{ marginTop: 20 }}>
                <Button variant="ghost" onClick={reset}>Back</Button>
                <Button variant="accent" loading={isSigningPermit2} onClick={signPermit2}>
                  {isSigningPermit2 ? "Awaiting signature..." : "Sign Permit2"}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Step 3: Execute / Success / Failed */}
          {(step === "execute" || step === "success" || step === "failed") ? (
            <div className="card card--primary">
              <h2 className="card-title">
                {step === "success"
                  ? "Transaction Confirmed"
                  : step === "failed"
                    ? "Transaction Failed"
                    : "Executing Transaction"}
              </h2>
              {step === "execute" ? (
                <p className="card-subtitle">
                  Signing your UserOperation and submitting to the bundler.
                </p>
              ) : null}

              <InlineProgressStepper stage={progressStage} startedAt={progressStartedAt} />

              {error ? <ErrorNotice error={error} /> : null}
              {result ? <FlowResultPanel result={result} id="token-flow-result" /> : null}

              {step === "success" || step === "failed" ? (
                <div className="button-row" style={{ marginTop: 20 }}>
                  <Button variant="ghost" onClick={reset}>Send Another</Button>
                  {step === "success" ? (
                    <Link href="/history">
                      <Button variant="primary">View History →</Button>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
