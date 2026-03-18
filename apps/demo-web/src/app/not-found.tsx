import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell" style={{ textAlign: "center", paddingTop: 80 }}>
      <h1 style={{ fontSize: "var(--text-hero)", fontFamily: "var(--font-serif)", letterSpacing: "-0.04em", margin: 0 }}>
        404
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 18, marginTop: 12 }}>
        This page could not be found.
      </p>
      <Link
        href="/"
        className="button button--accent"
        style={{ marginTop: 24, display: "inline-flex" }}
      >
        Back to Dashboard
      </Link>
    </main>
  );
}
