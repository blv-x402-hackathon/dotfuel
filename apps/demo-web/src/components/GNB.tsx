"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { LogoMark } from "@/components/LogoMark";
import { NotificationCenter } from "@/components/NotificationCenter";
import { WalletButton } from "@/components/WalletButton";
import { useHealthCheck, type HealthStatus } from "@/hooks/useHealthCheck";

const HEALTH_DOT_CLASS: Record<HealthStatus, string> = {
  checking: "health-dot--checking",
  ok: "health-dot--ok",
  degraded: "health-dot--degraded",
  down: "health-dot--down"
};

const HEALTH_LABEL: Record<HealthStatus, string> = {
  checking: "Connecting...",
  ok: "Live",
  degraded: "Degraded",
  down: "Offline"
};

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/send", label: "Send" },
  { href: "/sponsor", label: "Sponsor" },
  { href: "/history", label: "History" }
] as const;

export function GNB() {
  const pathname = usePathname();
  const health = useHealthCheck();

  return (
    <header className="gnb">
      <div className="gnb__inner">
        <Link href="/" className="gnb__brand" aria-label="DotFuel Home">
          <LogoMark className="gnb__logo" />
          <span className="gnb__brand-name">DotFuel</span>
        </Link>

        <nav className="gnb__nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`gnb__link ${isActive ? "gnb__link--active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="gnb__right">
          <span className="gnb__network">
            <span className={`hero-live-dot ${HEALTH_DOT_CLASS[health.overall]}`} aria-hidden />
            <span className="gnb__network-label">{HEALTH_LABEL[health.overall]}</span>
          </span>
          <NotificationCenter />
          <WalletButton />
        </div>
      </div>
      <style jsx>{`
        .gnb {
          position: sticky;
          top: 0;
          z-index: 40;
          border-bottom: 1px solid var(--line);
          background: rgba(246, 239, 227, 0.88);
          backdrop-filter: blur(12px);
        }

        .gnb__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          max-width: 1180px;
          margin: 0 auto;
          padding: 10px 20px;
        }

        .gnb__brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--ink);
          flex: none;
        }

        .gnb__brand-name {
          font-family: var(--font-serif), "Palatino Linotype", serif;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        .gnb__nav {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
          border-radius: var(--radius-full);
          background: rgba(36, 24, 14, 0.05);
        }

        .gnb__link {
          padding: 8px 16px;
          border-radius: var(--radius-full);
          color: var(--muted);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: color 120ms ease, background 120ms ease;
          white-space: nowrap;
        }

        .gnb__link:hover {
          color: var(--ink);
          background: rgba(36, 24, 14, 0.06);
        }

        .gnb__link--active {
          color: #fffaf2;
          background: var(--ink);
        }

        .gnb__link--active:hover {
          color: #fffaf2;
          background: var(--ink);
        }

        .gnb__right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: none;
        }

        .gnb__network {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .gnb__network-label {
          display: inline;
        }

        @media (prefers-color-scheme: dark) {
          .gnb {
            background: rgba(26, 20, 16, 0.88);
          }

          .gnb__nav {
            background: rgba(240, 230, 216, 0.06);
          }

          .gnb__link:hover {
            background: rgba(240, 230, 216, 0.08);
          }

          .gnb__link--active {
            background: rgba(240, 230, 216, 0.14);
            color: var(--ink);
          }

          .gnb__link--active:hover {
            background: rgba(240, 230, 216, 0.14);
            color: var(--ink);
          }
        }

        @media (max-width: 768px) {
          .gnb__nav {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .gnb__inner {
            padding: 8px 14px;
            max-width: none;
          }

          .gnb__brand-name {
            display: none;
          }

          .gnb__network-label {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
