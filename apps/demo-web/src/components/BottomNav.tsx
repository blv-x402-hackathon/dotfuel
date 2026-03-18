"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20V9.5z" />
        <path d="M9 21.5V14h6v7.5" />
      </svg>
    )
  },
  {
    href: "/send",
    label: "Send",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22l-4-9-9-4 20-7z" />
      </svg>
    )
  },
  {
    href: "/sponsor",
    label: "Sponsor",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 5-7 11-7 11S5 14 5 9a7 7 0 0 1 7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    )
  },
  {
    href: "/history",
    label: "History",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    )
  }
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`}
          >
            <span className="bottom-nav__icon" aria-hidden>{item.icon}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </Link>
        );
      })}
      <style jsx>{`
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 40;
          border-top: 1px solid var(--line);
          background: rgba(246, 239, 227, 0.92);
          backdrop-filter: blur(12px);
          padding: 6px 0 calc(6px + env(safe-area-inset-bottom, 0px));
        }

        .bottom-nav__item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          flex: 1;
          padding: 6px 4px;
          color: var(--muted);
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
          transition: color 120ms ease;
        }

        .bottom-nav__item--active {
          color: var(--accent);
        }

        .bottom-nav__icon {
          position: relative;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          border-radius: 12px;
          transition: background 120ms ease, transform 120ms ease;
        }

        .bottom-nav__item--active .bottom-nav__icon {
          background: rgba(199, 90, 46, 0.1);
          transform: scale(1.05);
        }

        .bottom-nav__icon :global(svg) {
          width: 22px;
          height: 22px;
          stroke: currentColor;
          flex: none;
        }

        .bottom-nav__item--active .bottom-nav__icon :global(svg path),
        .bottom-nav__item--active .bottom-nav__icon :global(svg circle) {
          fill: rgba(199, 90, 46, 0.15);
        }

        .bottom-nav__label {
          letter-spacing: 0.02em;
        }

        @media (prefers-color-scheme: dark) {
          :global(html:not([data-theme="light"])) .bottom-nav { background: rgba(26, 20, 16, 0.92); }
        }

        :global(html[data-theme="dark"]) .bottom-nav { background: rgba(26, 20, 16, 0.92); }

        @media (max-width: 768px) {
          .bottom-nav {
            display: flex;
          }
        }
      `}</style>
    </nav>
  );
}
