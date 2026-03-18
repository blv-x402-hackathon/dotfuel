"use client";

import { useEffect } from "react";

export interface ToastMessage {
  id: number;
  kind: "success" | "error";
  title: string;
  description: string;
}

export function Toast(props: {
  toast: ToastMessage | null;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const { toast, onDismiss, onOpen } = props;

  useEffect(() => {
    if (!toast || toast.kind !== "success") return;
    const timeout = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast]);

  if (!toast) return null;

  return (
    <aside
      className={`toast toast--${toast.kind}`}
      onClick={onOpen}
      role="status"
      aria-live="polite"
    >
      <div className="toast__content">
        <strong>{toast.title}</strong>
        <p>{toast.description}</p>
      </div>
      <button
        className="toast__close"
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
        type="button"
      >
        Close
      </button>
      <style jsx>{`
        .toast {
          position: fixed;
          top: 18px;
          right: 18px;
          z-index: 80;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: min(420px, calc(100vw - 32px));
          padding: 14px 14px 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(78, 54, 32, 0.14);
          box-shadow: 0 20px 48px rgba(40, 24, 10, 0.24);
          cursor: pointer;
        }

        .toast--success {
          background: rgba(239, 255, 248, 0.95);
          border-color: rgba(12, 122, 92, 0.24);
          color: #0f5c44;
        }

        .toast--error {
          background: rgba(255, 241, 237, 0.96);
          border-color: rgba(181, 67, 48, 0.28);
          color: #8f2f14;
        }

        .toast__content {
          display: grid;
          gap: 4px;
          min-width: 0;
          flex: 1;
        }

        .toast__content p {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
        }

        .toast__close {
          border: 0;
          background: transparent;
          color: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          min-height: 44px;
        }
      `}</style>
    </aside>
  );
}
