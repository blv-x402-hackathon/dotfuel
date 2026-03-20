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

  const themeIcon = preference === "dark" ? (
    <svg viewBox="0 0 18 18" fill="none" width="15" height="15" aria-hidden>
      <path d="M15.5 11.5A7 7 0 0 1 6.5 2.5a7 7 0 1 0 9 9z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : preference === "light" ? (
    <svg viewBox="0 0 18 18" fill="none" width="15" height="15" aria-hidden>
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M4 4l1.1 1.1M12.9 12.9L14 14M4 14l1.1-1.1M12.9 5.1L14 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 18 18" fill="none" width="15" height="15" aria-hidden>
      <rect x="2" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 16h6M9 13v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );

  const themeLabel = preference === "system" ? "System theme" : preference === "light" ? "Light mode" : "Dark mode";

  return (
    <header className={`gnb${scrolled ? " gnb--scrolled" : ""}`}>
      <div className="gnb__inner">
        {/* Left: brand + status */}
        <div className="gnb__left">
          <Link href="/" className="gnb__brand" aria-label="DotFuel Home">
            <LogoMark className="gnb__logo" />
            <span className="gnb__wordmark">DotFuel</span>
          </Link>
          <span className="gnb__live">
            <span className={`gnb__live-dot ${HEALTH_DOT_CLASS[health.overall]}`} aria-hidden />
          </span>
        </div>

        {/* Center: nav */}
        <nav className="gnb__nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`gnb__link${isActive ? " gnb__link--active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: actions */}
        <div className="gnb__right">
          <button
            className="gnb__icon-btn"
            onClick={cycleTheme}
            type="button"
            aria-label={themeLabel}
            title={themeLabel}
          >
            {themeIcon}
          </button>
          <NotificationCenter />
          <div className="gnb__sep" aria-hidden />
          <WalletButton />
        </div>
      </div>

      <style jsx>{`
        .gnb {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(246, 239, 227, 0.82);
          backdrop-filter: blur(24px) saturate(1.6);
          -webkit-backdrop-filter: blur(24px) saturate(1.6);
          border-bottom: 1px solid transparent;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .gnb--scrolled {
          border-bottom-color: rgba(78, 54, 32, 0.08);
          box-shadow: 0 1px 0 rgba(78, 54, 32, 0.04);
        }

        .gnb__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 24px;
          height: 54px;
        }

        /* ─── Left ──────────────────────────────── */

        .gnb__left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: none;
          min-width: 0;
        }

        .gnb__brand {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          color: var(--ink);
          flex: none;
          transition: opacity 150ms ease;
        }

        .gnb__brand:hover { opacity: 0.7; }

        :global(.gnb__logo) {
          width: 28px;
          height: 28px;
          flex: none;
          border-radius: 7px;
        }

        .gnb__wordmark {
          font-family: var(--font-serif), "Palatino Linotype", serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.04em;
        }

        .gnb__live {
          display: inline-flex;
          align-items: center;
          margin-left: 2px;
        }

        :global(.gnb__live-dot) {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        /* ─── Nav ───────────────────────────────── */

        .gnb__nav {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .gnb__link {
          padding: 5px 14px;
          color: var(--muted);
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          border-radius: 8px;
          transition: color 140ms ease, background 140ms ease;
          white-space: nowrap;
        }

        .gnb__link:hover {
          color: var(--ink);
        }

        .gnb__link--active {
          color: var(--ink);
          font-weight: 650;
          background: rgba(36, 24, 14, 0.06);
        }

        /* ─── Right ─────────────────────────────── */

        .gnb__right {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: none;
        }

        .gnb__icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          transition: color 140ms ease, background 140ms ease;
        }

        .gnb__icon-btn:hover {
          color: var(--ink);
          background: rgba(36, 24, 14, 0.06);
        }

        .gnb__sep {
          width: 1px;
          height: 18px;
          margin: 0 6px;
          background: var(--line);
          border-radius: 1px;
        }

        /* ─── Dark ──────────────────────────────── */

        @media (prefers-color-scheme: dark) {
          :global(html:not([data-theme="light"])) .gnb {
            background: rgba(22, 18, 14, 0.82);
          }
          :global(html:not([data-theme="light"])) .gnb--scrolled {
            border-bottom-color: rgba(255, 255, 255, 0.06);
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
          }
          :global(html:not([data-theme="light"])) .gnb__link:hover {
            color: var(--ink);
          }
          :global(html:not([data-theme="light"])) .gnb__link--active {
            background: rgba(255, 255, 255, 0.08);
          }
          :global(html:not([data-theme="light"])) .gnb__icon-btn:hover {
            background: rgba(255, 255, 255, 0.08);
          }
        }

        :global(html[data-theme="dark"]) .gnb {
          background: rgba(22, 18, 14, 0.82);
        }
        :global(html[data-theme="dark"]) .gnb--scrolled {
          border-bottom-color: rgba(255, 255, 255, 0.06);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
        }
        :global(html[data-theme="dark"]) .gnb__link:hover {
          color: var(--ink);
        }
        :global(html[data-theme="dark"]) .gnb__link--active {
          background: rgba(255, 255, 255, 0.08);
        }
        :global(html[data-theme="dark"]) .gnb__icon-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        /* ─── Responsive ────────────────────────── */

        @media (max-width: 768px) {
          .gnb__nav { display: none; }
        }

        @media (max-width: 480px) {
          .gnb__inner {
            padding: 0 14px;
            height: 48px;
          }
          .gnb__wordmark { display: none; }
          .gnb__sep { display: none; }
        }
      `}</style>
    </header>
  );
}
