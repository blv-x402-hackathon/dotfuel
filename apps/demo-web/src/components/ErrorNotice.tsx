"use client";

import type { UiError } from "@/lib/uiError";

interface ErrorAction {
  label: string;
  onClick: () => void;
}

export function ErrorNotice({ error, action }: { error: UiError; action?: ErrorAction }) {
  return (
    <div className="feedback">
      <strong>{error.message}</strong>
      {action ? (
        <div className="feedback__action-row">
          <button
            className="button button--sm button--ghost"
            onClick={action.onClick}
            type="button"
          >
            {action.label}
          </button>
        </div>
      ) : null}
      {error.debug ? (
        <details className="debug-details">
          <summary>Debug details</summary>
          <pre>{error.debug}</pre>
        </details>
      ) : null}
    </div>
  );
}
