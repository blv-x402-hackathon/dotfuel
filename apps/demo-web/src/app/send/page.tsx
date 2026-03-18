"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/Button";
import { TokenSelector, type TokenOption } from "@/components/ui/TokenSelector";
import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { ErrorNotice } from "@/components/ErrorNotice";
import { FlowResultPanel } from "@/components/FlowResultPanel";
import { InlineProgressStepper } from "@/components/InlineProgressStepper";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/ToastContext";
import { useWalletModal } from "@/components/WalletContext";
import { useSendWizard, type SendStep } from "@/hooks/useSendWizard";
import { formatAmount } from "@/lib/flowResults";

const SUPPORTED_TOKENS: TokenOption[] = [
  {
    address: (process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`) ?? "0x0",
    symbol: "tUSDT",
    name: "Test USDT",
    decimals: 6
  }
];

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
  const [selectedToken, setSelectedToken] = useState<TokenOption>(SUPPORTED_TOKENS[0]);
  const {
    step, isFetchingQuote, isSigningPermit2, quoteCtx, result, error,
    progressStage, progressStartedAt,
    fetchQuote, signPermit2, executeUserOp, reset
  } = useSendWizard();

  const prevStepRef = useRef(step);
  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;
    if (step === "success" && prev !== "success" && result) {
      toast("success", "Transaction confirmed", `Gas: ${result.gasCostLabel} → ${result.settlementLabel}`);
    } else if (step === "failed" && prev !== "failed" && error) {
      toast("error", "Transaction failed", error.message);
    }
  }, [step, result, error, toast]);

  if (!isConnected) {
    return (
      <main className="page-shell">
        <h1 className="page-section-title">Pay with Token</h1>
        <p className="card-subtitle mt-1-5">
          Send a gasless transaction and settle gas in tUSDT via Permit2.
        </p>
        <div className="card card--centered mt-6">
          <EmptyState
            illustration="wallet-required"
            title="Wallet Required"
            description="Connect your wallet to send gasless transactions."
          >
            <Button variant="accent" onClick={openModal}>Connect Wallet</Button>
          </EmptyState>
        </div>
      </main>
    );
  }

  const currentStep = stepIndex(step);

  return (
    <main className="page-shell">
      <h1 className="page-section-title">Pay with Token</h1>
      <p className="card-subtitle mt-1-5">
        Send a gasless transaction and settle gas in tUSDT via Permit2.
      </p>

      <div className="section-grid mt-6">
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
                <TokenSelector
                  tokens={SUPPORTED_TOKENS}
                  selected={selectedToken}
                  onChange={setSelectedToken}
                  label="Payment Token"
                  disabled={isFetchingQuote}
                />

                <div className="wizard-field">
                  <span className="label">Target Contract</span>
                  <div className="wizard-action-row">
                    <span className="wizard-action__name">Demo Contract</span>
                    <span className="wizard-action__detail">execute("Hello DotFuel!")</span>
                  </div>
                </div>

                <div className="wizard-field">
                  <span className="label">What happens</span>
                  <ol className="wizard-step-list">
                    <li>Your smart account approves Permit2 to spend tUSDT</li>
                    <li>The demo contract is called with your message</li>
                    <li>Gas is settled in tUSDT — 0 native token required</li>
                  </ol>
                </div>
              </div>

              {error ? (
                <ErrorNotice
                  error={error}
                  action={
                    error.message.toLowerCase().includes("wallet") || error.message.toLowerCase().includes("connect")
                      ? { label: "Connect Wallet", onClick: openModal }
                      : error.debug?.toLowerCase().includes("network") || error.debug?.toLowerCase().includes("fetch")
                        ? { label: "Retry", onClick: fetchQuote }
                        : undefined
                  }
                />
              ) : null}

              <div className="button-row mt-5">
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
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden className="flex-none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 5.5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span>
                  Only the actual gas cost will be charged — never more than the estimate above.
                </span>
              </div>

              {error ? <ErrorNotice error={error} /> : null}

              <div className="button-row mt-5">
                <Button variant="ghost" onClick={reset}>Back</Button>
                <Button variant="accent" loading={isSigningPermit2} onClick={signPermit2}>
                  {isSigningPermit2 ? "Awaiting signature..." : "Sign Permit2"}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Step 3: Confirm & Execute */}
          {step === "execute" && !progressStage && quoteCtx ? (
            <div className="card card--primary">
              <h2 className="card-title">Confirm & Submit</h2>
              <p className="card-subtitle">
                Review the final details before submitting your UserOperation to the bundler.
              </p>

              <div className="review-grid">
                <div className="review-item">
                  <span className="label">Max Gas Cost</span>
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
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden className="flex-none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 5.5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span>
                  Permit2 signature is ready. Submit to complete the gasless transaction.
                </span>
              </div>

              {error ? <ErrorNotice error={error} /> : null}

              <div className="button-row mt-5">
                <Button variant="ghost" onClick={reset}>Cancel</Button>
                <Button variant="accent" onClick={executeUserOp}>
                  Confirm & Submit →
                </Button>
              </div>
            </div>
          ) : null}

          {/* Step 3: Executing / Success / Failed */}
          {(step === "execute" && progressStage) || step === "success" || step === "failed" ? (
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
                <div className="button-row mt-5">
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
