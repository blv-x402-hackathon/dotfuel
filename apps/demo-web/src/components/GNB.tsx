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
          <button
            className="gnb__cmd-btn"
            type="button"
            aria-label="Open command palette (⌘K)"
            title="Command palette (⌘K)"
            onClick={() => {
              // Dispatch a synthetic Cmd+K to open the palette
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden>
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <kbd aria-hidden>⌘K</kbd>
          </button>
          <button
            className="gnb__theme-btn"
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
          box-shadow: none;
          transition: box-shadow 200ms ease;
        }

        .gnb--scrolled {
          box-shadow: var(--shadow-sm);
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

        :global(.gnb__logo) {
          width: 32px;
          height: 32px;
          flex: none;
          border-radius: 8px;
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

        .gnb__cmd-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid var(--line);
          background: transparent;
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 120ms, color 120ms;
        }

        .gnb__cmd-btn kbd {
          font-family: inherit;
          font-size: 11px;
        }

        .gnb__cmd-btn:hover {
          background: rgba(36, 24, 14, 0.06);
          color: var(--ink);
        }

        .gnb__theme-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          transition: background 120ms ease, color 120ms ease;
        }

        .gnb__theme-btn:hover {
          background: rgba(36, 24, 14, 0.06);
          color: var(--ink);
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
          :global(html:not([data-theme="light"])) .gnb { background: rgba(26, 20, 16, 0.88); }
          :global(html:not([data-theme="light"])) .gnb__nav { background: rgba(240, 230, 216, 0.06); }
          :global(html:not([data-theme="light"])) .gnb__link:hover { background: rgba(240, 230, 216, 0.08); }
          :global(html:not([data-theme="light"])) .gnb__link--active { background: rgba(240, 230, 216, 0.14); color: var(--ink); }
          :global(html:not([data-theme="light"])) .gnb__link--active:hover { background: rgba(240, 230, 216, 0.14); color: var(--ink); }
        }

        :global(html[data-theme="dark"]) .gnb { background: rgba(26, 20, 16, 0.88); }
        :global(html[data-theme="dark"]) .gnb__nav { background: rgba(240, 230, 216, 0.06); }
        :global(html[data-theme="dark"]) .gnb__link:hover { background: rgba(240, 230, 216, 0.08); }
        :global(html[data-theme="dark"]) .gnb__link--active { background: rgba(240, 230, 216, 0.14); color: var(--ink); }
        :global(html[data-theme="dark"]) .gnb__link--active:hover { background: rgba(240, 230, 216, 0.14); color: var(--ink); }

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
