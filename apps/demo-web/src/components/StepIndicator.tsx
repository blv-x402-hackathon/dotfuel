"use client";

export interface GuidedStep {
  title: string;
  description: string;
  status: "done" | "active" | "locked";
}

export function StepIndicator({ steps, onQuickDemo }: { steps: GuidedStep[]; onQuickDemo: () => void }) {
  return (
    <section className="card step-indicator">
      <div className="step-indicator__header">
        <div>
          <h2 className="card-title">Guided Demo Flow</h2>
          <p className="card-subtitle">Run the exact judge path: connect, validate, execute, and verify settlement.</p>
        </div>
        <button className="button button--accent" onClick={onQuickDemo} type="button">
          Quick Demo
        </button>
      </div>
      <ol className="step-indicator__list">
        {steps.map((step, index) => (
          <li className={`step-indicator__item step-indicator__item--${step.status}`} key={step.title}>
            <span className="step-indicator__index">{index + 1}</span>
            <div>
              <div className="step-indicator__title">{step.title}</div>
              <div className="step-indicator__description">{step.description}</div>
            </div>
          </li>
        ))}
      </ol>
      <style jsx>{`
        .step-indicator {
          margin-top: 18px;
        }

        .step-indicator__header {
          display: flex;
          gap: 16px;
          justify-content: space-between;
          align-items: flex-start;
        }

        .step-indicator__list {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin: 16px 0 0;
          padding: 0;
          list-style: none;
        }

        .step-indicator__item {
          display: grid;
          gap: 8px;
          padding: 14px;
          border: 1px solid rgba(78, 54, 32, 0.12);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.52);
          transition: 180ms ease;
        }

        .step-indicator__item--locked {
          opacity: 0.55;
        }

        .step-indicator__item--done {
          border-color: rgba(12, 122, 92, 0.28);
          background: rgba(12, 122, 92, 0.08);
        }

        .step-indicator__item--active {
          border-color: rgba(199, 90, 46, 0.42);
          background: rgba(199, 90, 46, 0.1);
          box-shadow: 0 0 0 1px rgba(199, 90, 46, 0.26), 0 10px 18px rgba(199, 90, 46, 0.18);
          animation: stepPulse 1400ms ease-in-out infinite;
        }

        .step-indicator__index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid rgba(78, 54, 32, 0.22);
          background: #fff;
          font-size: 13px;
          font-weight: 700;
        }

        .step-indicator__title {
          font-size: 14px;
          font-weight: 700;
        }

        .step-indicator__description {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }

        @keyframes stepPulse {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-1px);
          }
        }

        @media (max-width: 900px) {
          .step-indicator__header {
            flex-direction: column;
          }

          .step-indicator__list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
