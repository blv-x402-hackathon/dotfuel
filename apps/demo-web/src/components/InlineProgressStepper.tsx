"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type InlineProgressStage = "signing" | "submitting" | "waiting" | "done";

const STEPS = [
  { key: "signing", label: "Signing..." },
  { key: "submitting", label: "Submitting to bundler..." },
  { key: "waiting", label: "Waiting for receipt..." },
  { key: "done", label: "Done ✓" }
] as const;

const STEP_INDEX: Record<InlineProgressStage, number> = {
  signing: 0,
  submitting: 1,
  waiting: 2,
  done: 3
};

function getStepStatus(stage: InlineProgressStage, stepIndex: number) {
  const currentIndex = STEP_INDEX[stage];
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return stage === "done" ? "done" : "active";
  return "pending";
}

export function InlineProgressStepper({ stage, startedAt }: { stage: InlineProgressStage | null; startedAt: number | null }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const completedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };
    tick();
    const interval = window.setInterval(tick, 500);

    return () => window.clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    if (stage === "done") {
      completedAtRef.current = Date.now();
      setShowComplete(true);
      setFadeOut(false);
      const fadeTimer = window.setTimeout(() => setFadeOut(true), 1600);
      const hideTimer = window.setTimeout(() => setShowComplete(false), 2200);
      return () => {
        window.clearTimeout(fadeTimer);
        window.clearTimeout(hideTimer);
      };
    }
  }, [stage]);

  const elapsedLabel = useMemo(() => `${elapsedSeconds}s`, [elapsedSeconds]);

  if (showComplete) {
    return (
      <div className={`progress-stepper progress-stepper--complete ${fadeOut ? "progress-stepper--fade" : ""}`} aria-live="polite">
        <span className="progress-stepper__done-label">✓ Completed in {elapsedLabel}</span>
      </div>
    );
  }

  if (!stage || !startedAt) return null;

  return (
    <div className="progress-stepper" aria-live="polite">
      <div className="progress-stepper__header">
        <span className="label">Execution Progress</span>
        <span className="progress-stepper__time">{elapsedLabel}</span>
      </div>
      <ol className="progress-stepper__list">
        {STEPS.map((step, index) => {
          const status = getStepStatus(stage, index);
          return (
            <li className={`progress-step progress-step--${status}`} key={step.key}>
              <span className="progress-step__dot" aria-hidden>
                {status === "active" ? <span className="progress-step__spinner" /> : status === "done" ? "✓" : "•"}
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
      <style jsx>{`
        .progress-stepper {
          margin-top: 14px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(78, 54, 32, 0.12);
          background: rgba(255, 255, 255, 0.62);
          transition: opacity 600ms ease;
        }

        .progress-stepper--complete {
          border-color: rgba(12, 122, 92, 0.28);
          background: rgba(12, 122, 92, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .progress-stepper--fade {
          opacity: 0;
        }

        .progress-stepper__done-label {
          color: var(--success);
          font-weight: 700;
          font-size: 14px;
        }

        .progress-stepper__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .progress-stepper__time {
          color: var(--muted);
          font-size: 13px;
          font-weight: 600;
        }

        .progress-stepper__list {
          display: grid;
          gap: 8px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          font-size: 14px;
        }

        .progress-step--done {
          color: var(--success);
        }

        .progress-step--active {
          color: var(--ink);
          font-weight: 600;
        }

        .progress-step__dot {
          display: inline-flex;
          width: 18px;
          height: 18px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(78, 54, 32, 0.18);
          background: var(--card-strong, #fff);
          font-size: 12px;
          flex: none;
        }

        .progress-step--done .progress-step__dot {
          border-color: rgba(12, 122, 92, 0.3);
          background: rgba(12, 122, 92, 0.12);
        }

        .progress-step--active .progress-step__dot {
          border-color: rgba(199, 90, 46, 0.28);
          background: rgba(199, 90, 46, 0.1);
        }

        .progress-step__spinner {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          border: 2px solid rgba(199, 90, 46, 0.3);
          border-top-color: var(--accent);
          animation: spin 800ms linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (prefers-color-scheme: dark) {
          .progress-stepper {
            background: rgba(47, 36, 27, 0.8);
            border-color: var(--line);
          }

          .progress-stepper--complete {
            background: var(--success-bg);
            border-color: var(--success-border);
          }

          .progress-step__dot {
            background: rgba(32, 24, 18, 0.92);
            border-color: var(--line);
          }
        }
      `}</style>
    </div>
  );
}
