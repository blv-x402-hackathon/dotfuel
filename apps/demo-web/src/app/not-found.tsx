import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell page-shell--centered">
      <h1 className="not-found-title">404</h1>
      <p className="not-found-desc">This page could not be found.</p>
      <Link href="/" className="button button--accent mt-6">
        Back to Dashboard
      </Link>
    </main>
  );
}
