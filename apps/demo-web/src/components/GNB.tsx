"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { LogoMark } from "@/components/LogoMark";
import { NotificationCenter } from "@/components/NotificationCenter";
import { WalletButton } from "@/components/WalletButton";
import { useTheme } from "@/components/ThemeProvider";
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
  const { preference, setPreference } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 4);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function cycleTheme() {
    if (preference === "system") setPreference("light");
    else if (preference === "light") setPreference("dark");
    else setPreference("system");
  }

  const themeLabel = preference === "system" ? "System theme" : preference === "light" ? "Light mode" : "Dark mode";

  return (
    <header className={`gnb${scrolled ? " gnb--scrolled" : ""}`}>
      <div className="gnb__inner">
        <Link href="/" className="gnb__brand" aria-label="DotFuel Home">
          <LogoMark className="gnb__logo" />
          <span className="gnb__brand-name">DotFuel</span>
        </Link>

        <nav className="gnb__nav" aria-label="Main navigation">
          <div className="gnb__nav-track">
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
          </div>
        </nav>

        <div className="gnb__right">
          <span className="gnb__status">
            <span className={`hero-live-dot ${HEALTH_DOT_CLASS[health.overall]}`} aria-hidden />
            <span className="gnb__status-label">{HEALTH_LABEL[health.overall]}</span>
          </span>
          <div className="gnb__actions">
            <button
              className="gnb__icon-btn"
              onClick={cycleTheme}
              type="button"
              aria-label={themeLabel}
              title={themeLabel}
            >
              {preference === "dark" ? (
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden>
                  <path d="M17.3 13.3A8 8 0 0 1 6.7 2.7a8 8 0 1 0 10.6 10.6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : preference === "light" ? (
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden>
                  <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden>
                  <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <NotificationCenter />
          </div>
          <WalletButton />
        </div>
      </div>
      <style jsx>{`
        .gnb {
          position: sticky;
          top: 0;
          z-index: 40;
          border-bottom: 1px solid transparent;
          background: rgba(246, 239, 227, 0.72);
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
          transition: border-color 240ms ease, box-shadow 240ms ease, background 240ms ease;
        }

        .gnb--scrolled {
          border-bottom-color: var(--line);
          box-shadow: 0 1px 12px rgba(40, 24, 10, 0.06);
          background: rgba(246, 239, 227, 0.92);
        }

        .gnb__inner {
          display: flex;
          align-items: center;
          gap: 20px;
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 24px;
          height: 56px;
        }

        .gnb__brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--ink);
          flex: none;
        }

        .gnb__brand:hover {
          opacity: 0.85;
        }

        .gnb__brand-name {
          font-family: var(--font-serif), "Palatino Linotype", serif;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.04em;
        }

        :global(.gnb__logo) {
          width: 30px;
          height: 30px;
          flex: none;
          border-radius: 8px;
        }

        /* ─── Nav ───────────────────────────────── */

        .gnb__nav {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .gnb__nav-track {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 3px;
          border-radius: 12px;
          background: rgba(36, 24, 14, 0.04);
        }

        .gnb__link {
          position: relative;
          padding: 6px 16px;
          border-radius: 9px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.005em;
          text-decoration: none;
          transition: color 160ms ease, background 160ms ease;
          white-space: nowrap;
          user-select: none;
        }

        .gnb__link:hover {
          color: var(--ink);
          background: rgba(36, 24, 14, 0.04);
        }

        .gnb__link--active {
          color: var(--ink);
          background: var(--card-strong);
          box-shadow: 0 1px 3px rgba(40, 24, 10, 0.08), 0 0 0 1px rgba(40, 24, 10, 0.04);
        }

        .gnb__link--active:hover {
          color: var(--ink);
          background: var(--card-strong);
        }

        /* ─── Right ─────────────────────────────── */

        .gnb__right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: none;
        }

        .gnb__status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px 4px 8px;
          border-radius: 999px;
          background: rgba(36, 24, 14, 0.03);
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .gnb__status-label {
          display: inline;
        }

        .gnb__actions {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .gnb__icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          transition: background 140ms ease, color 140ms ease;
        }

        .gnb__icon-btn:hover {
          background: rgba(36, 24, 14, 0.06);
          color: var(--ink);
        }

        /* ─── Dark mode ─────────────────────────── */

        @media (prefers-color-scheme: dark) {
          :global(html:not([data-theme="light"])) .gnb {
            background: rgba(26, 20, 16, 0.72);
          }
          :global(html:not([data-theme="light"])) .gnb--scrolled {
            background: rgba(26, 20, 16, 0.92);
            box-shadow: 0 1px 12px rgba(0, 0, 0, 0.2);
          }
          :global(html:not([data-theme="light"])) .gnb__nav-track {
            background: rgba(255, 255, 255, 0.05);
          }
          :global(html:not([data-theme="light"])) .gnb__link:hover {
            background: rgba(255, 255, 255, 0.06);
          }
          :global(html:not([data-theme="light"])) .gnb__link--active {
            background: rgba(255, 255, 255, 0.1);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.06);
          }
          :global(html:not([data-theme="light"])) .gnb__link--active:hover {
            background: rgba(255, 255, 255, 0.1);
          }
          :global(html:not([data-theme="light"])) .gnb__status {
            background: rgba(255, 255, 255, 0.05);
          }
          :global(html:not([data-theme="light"])) .gnb__icon-btn:hover {
            background: rgba(255, 255, 255, 0.08);
          }
        }

        :global(html[data-theme="dark"]) .gnb {
          background: rgba(26, 20, 16, 0.72);
        }
        :global(html[data-theme="dark"]) .gnb--scrolled {
          background: rgba(26, 20, 16, 0.92);
          box-shadow: 0 1px 12px rgba(0, 0, 0, 0.2);
        }
        :global(html[data-theme="dark"]) .gnb__nav-track {
          background: rgba(255, 255, 255, 0.05);
        }
        :global(html[data-theme="dark"]) .gnb__link:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        :global(html[data-theme="dark"]) .gnb__link--active {
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.06);
        }
        :global(html[data-theme="dark"]) .gnb__link--active:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        :global(html[data-theme="dark"]) .gnb__status {
          background: rgba(255, 255, 255, 0.05);
        }
        :global(html[data-theme="dark"]) .gnb__icon-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        /* ─── Responsive ────────────────────────── */

        @media (max-width: 768px) {
          .gnb__nav {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .gnb__inner {
            padding: 0 14px;
            height: 50px;
            gap: 10px;
          }

          .gnb__brand-name {
            display: none;
          }

          .gnb__status-label {
            display: none;
          }

          .gnb__status {
            padding: 4px 6px;
          }
        }
      `}</style>
    </header>
  );
}
