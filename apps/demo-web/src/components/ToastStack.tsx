"use client";

import { useEffect, useRef } from "react";
import { useToast, type ToastItem, type ToastKind } from "@/components/ToastContext";

const AUTO_DISMISS_MS: Record<ToastKind, number> = {
  success: 4000,
  error: 8000,
  warning: 6000,
  info: 5000
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setTimeout(() => onDismiss(item.id), AUTO_DISMISS_MS[item.kind]);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [item.id, item.kind, onDismiss]);

  return (
    <div
      className={`toast-card toast-card--${item.kind}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="toast-card__content">
        <strong className="toast-card__title">{item.title}</strong>
        {item.description ? <p className="toast-card__desc">{item.description}</p> : null}
      </div>
      <button
        className="toast-card__close"
        onClick={() => onDismiss(item.id)}
        type="button"
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden>
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function ToastStack() {
  const { queue, dismiss } = useToast();

  if (queue.length === 0) return null;

  return (
    <div className="toast-stack" aria-label="Notifications">
      {queue.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
      <style jsx>{`
        .toast-stack {
          position: fixed;
          top: 18px;
          right: 18px;
          z-index: 80;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: min(400px, calc(100vw - 32px));
          pointer-events: none;
        }

        :global(.toast-card) {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 14px 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(78, 54, 32, 0.14);
          box-shadow: 0 20px 48px rgba(40, 24, 10, 0.24);
          pointer-events: auto;
          animation: toastSlideIn 220ms ease both;
        }

        :global(.toast-card--success) {
          background: rgba(239, 255, 248, 0.97);
          border-color: rgba(12, 122, 92, 0.24);
          color: #0f5c44;
        }

        :global(.toast-card--error) {
          background: rgba(255, 241, 237, 0.97);
          border-color: rgba(181, 67, 48, 0.28);
          color: #8f2f14;
        }

        :global(.toast-card--warning) {
          background: rgba(255, 250, 235, 0.97);
          border-color: rgba(217, 119, 6, 0.28);
          color: #92560a;
        }

        :global(.toast-card--info) {
          background: rgba(240, 248, 255, 0.97);
          border-color: rgba(59, 130, 246, 0.28);
          color: #1e4a82;
        }

        :global(.toast-card__content) {
          flex: 1;
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        :global(.toast-card__title) {
          font-size: 14px;
          font-weight: 700;
          line-height: 1.3;
        }

        :global(.toast-card__desc) {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          opacity: 0.85;
        }

        :global(.toast-card__close) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: inherit;
          opacity: 0.6;
          cursor: pointer;
          flex: none;
          transition: opacity 120ms ease;
        }

        :global(.toast-card__close:hover) {
          opacity: 1;
        }

        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @media (prefers-color-scheme: dark) {
          :global(html:not([data-theme="light"]) .toast-card--success) { background: rgba(20, 48, 38, 0.97); border-color: var(--success-border); color: var(--success); }
          :global(html:not([data-theme="light"]) .toast-card--error) { background: rgba(48, 24, 20, 0.97); border-color: var(--danger-border); color: var(--danger); }
          :global(html:not([data-theme="light"]) .toast-card--warning) { background: rgba(48, 36, 16, 0.97); border-color: rgba(217, 119, 6, 0.3); color: #d97706; }
          :global(html:not([data-theme="light"]) .toast-card--info) { background: rgba(18, 32, 54, 0.97); border-color: rgba(59, 130, 246, 0.3); color: #60a5fa; }
        }

        :global(html[data-theme="dark"] .toast-card--success) { background: rgba(20, 48, 38, 0.97); border-color: var(--success-border); color: var(--success); }
        :global(html[data-theme="dark"] .toast-card--error) { background: rgba(48, 24, 20, 0.97); border-color: var(--danger-border); color: var(--danger); }
        :global(html[data-theme="dark"] .toast-card--warning) { background: rgba(48, 36, 16, 0.97); border-color: rgba(217, 119, 6, 0.3); color: #d97706; }
        :global(html[data-theme="dark"] .toast-card--info) { background: rgba(18, 32, 54, 0.97); border-color: rgba(59, 130, 246, 0.3); color: #60a5fa; }

        @media (max-width: 480px) {
          .toast-stack {
            top: auto;
            bottom: calc(72px + env(safe-area-inset-bottom, 0px) + 10px);
            left: 16px;
            right: 16px;
            width: auto;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          :global(.toast-card) {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
