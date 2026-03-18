import type { ReactNode } from "react";

type IllustrationKind = "wallet-required" | "empty-tx" | "no-results" | "empty-campaign";

interface EmptyStateProps {
  illustration: IllustrationKind;
  title: string;
  description: string;
  children?: ReactNode;
}

function Illustration({ kind }: { kind: IllustrationKind }) {
  switch (kind) {
    case "wallet-required":
      return (
        <svg className="empty-state__icon" viewBox="0 0 56 56" fill="none" aria-hidden>
          <circle cx="28" cy="28" r="24" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 3" />
          <path d="M20 28c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="28" cy="28" r="3" fill="var(--accent)" />
          <path d="M28 10v4M28 42v4M10 28h4M42 28h4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        </svg>
      );
    case "empty-tx":
      return (
        <svg className="empty-state__icon" viewBox="0 0 56 56" fill="none" aria-hidden>
          <rect x="10" y="14" width="36" height="28" rx="7" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 3" />
          <path d="M18 24h12M18 30h8" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="38" cy="36" r="7" fill="var(--bg)" stroke="var(--success)" strokeWidth="1.5" />
          <path d="M34.5 36l2 2 4-3.5" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "no-results":
      return (
        <svg className="empty-state__icon" viewBox="0 0 56 56" fill="none" aria-hidden>
          <circle cx="24" cy="24" r="14" stroke="var(--muted)" strokeWidth="1.5" />
          <path d="M34 34l10 10" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
          <path d="M19 19l10 10M29 19L19 29" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "empty-campaign":
      return (
        <svg className="empty-state__icon" viewBox="0 0 56 56" fill="none" aria-hidden>
          <rect x="8" y="8" width="40" height="40" rx="10" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5 3" />
          <path d="M20 28h16M28 20v16" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

export function EmptyState({ illustration, title, description, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Illustration kind={illustration} />
      <strong>{title}</strong>
      <p>{description}</p>
      {children}
    </div>
  );
}
