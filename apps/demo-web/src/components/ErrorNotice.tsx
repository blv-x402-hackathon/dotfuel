"use client";

import type { UiError } from "@/lib/uiError";

export function ErrorNotice({ error }: { error: UiError }) {
  return (
    <div className="feedback">
      <strong>{error.message}</strong>
      {error.debug ? (
        <details className="debug-details">
          <summary>Debug details</summary>
          <pre>{error.debug}</pre>
        </details>
      ) : null}
    </div>
  );
}
