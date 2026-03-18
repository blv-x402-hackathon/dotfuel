import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell page-shell--centered">
      <div className="not-found-icon" aria-hidden>
        <svg viewBox="0 0 80 80" fill="none" width="80" height="80">
          <circle cx="40" cy="40" r="36" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="8 5" opacity="0.6" />
          <path d="M28 28l24 24M52 28L28 52" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="not-found-title">404</h1>
      <p className="not-found-desc">This page could not be found.</p>
      <p className="not-found-hint">
        Lost your way? Here are some helpful destinations:
      </p>
      <div className="not-found-links">
        <Link href="/" className="button button--accent">
          Dashboard
        </Link>
        <Link href="/send" className="button button--ghost">
          Send
        </Link>
        <Link href="/sponsor" className="button button--ghost">
          Sponsor
        </Link>
        <Link href="/history" className="button button--ghost">
          History
        </Link>
      </div>
    </main>
  );
}
