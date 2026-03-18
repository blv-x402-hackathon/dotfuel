"use client";

import { LogoMark } from "@/components/LogoMark";

const PRODUCT_LINKS = [
  { label: "Dashboard", href: "/" },
  { label: "Send", href: "/send" },
  { label: "Sponsor", href: "/sponsor" },
  { label: "History", href: "/history" }
];

const RESOURCE_LINKS = [
  { label: "Documentation", href: "#" },
  { label: "GitHub", href: "#" },
  { label: "Block Explorer", href: "https://blockscout-testnet.polkadot.io/" }
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__brand-row">
            <LogoMark className="footer__logo" />
            <span className="footer__brand-name">DotFuel</span>
          </div>
          <p className="footer__tagline">Pay blockchain gas with any token.</p>
        </div>

        <div className="footer__links">
          <div className="footer__group">
            <h4 className="footer__group-title">Product</h4>
            {PRODUCT_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="footer__link">{link.label}</a>
            ))}
          </div>
          <div className="footer__group">
            <h4 className="footer__group-title">Resources</h4>
            {RESOURCE_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="footer__link" target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <span className="footer__copyright">&copy; {new Date().getFullYear()} DotFuel. Built on Polkadot.</span>
      </div>

      <style jsx>{`
        .footer {
          margin-top: 48px;
          border-top: 1px solid var(--line);
          background: rgba(36, 24, 14, 0.03);
        }

        .footer__inner {
          display: flex;
          justify-content: space-between;
          gap: 32px;
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px 20px 24px;
        }

        .footer__brand-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .footer__brand-name {
          font-family: var(--font-serif), "Palatino Linotype", serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        .footer__tagline {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 14px;
        }

        .footer__links {
          display: flex;
          gap: 48px;
        }

        .footer__group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .footer__group-title {
          margin: 0 0 4px;
          color: var(--ink);
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .footer__link {
          color: var(--muted);
          font-size: 14px;
          text-decoration: none;
          transition: color 120ms ease;
        }

        .footer__link:hover {
          color: var(--ink);
        }

        .footer__bottom {
          max-width: 1180px;
          margin: 0 auto;
          padding: 16px 20px;
          border-top: 1px solid var(--line);
        }

        .footer__copyright {
          color: var(--muted);
          font-size: 12px;
        }

        @media (prefers-color-scheme: dark) {
          .footer {
            background: rgba(240, 230, 216, 0.02);
          }
        }

        @media (max-width: 600px) {
          .footer__inner {
            flex-direction: column;
            gap: 24px;
          }

          .footer__links {
            gap: 32px;
          }
        }

        @media (max-width: 900px) {
          .footer {
            margin-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>
    </footer>
  );
}
