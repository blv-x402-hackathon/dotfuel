"use client";

import { useEffect, useState } from "react";

function truncateHex(value: string) {
  if (!value.startsWith("0x") || value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyableHex(props: {
  value?: string | null;
  href?: string;
  fallback?: string;
  truncate?: boolean;
}) {
  const { value, href, fallback = "-", truncate = true } = props;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  if (!value) {
    return <span className="value">{fallback}</span>;
  }

  const rendered = truncate ? truncateHex(value) : value;

  return (
    <span className="copyable-hex">
      {href ? (
        <a className="copyable-hex__value inline-link" href={href} target="_blank" rel="noreferrer" title={value}>
          {rendered}
        </a>
      ) : (
        <span className="copyable-hex__value" title={value}>{rendered}</span>
      )}
      <button
        className="copyable-hex__button"
        onClick={() => {
          copyText(value).then(() => setCopied(true)).catch(() => setCopied(false));
        }}
        title={copied ? "Copied!" : "Copy to clipboard"}
        type="button"
      >
        {copied ? (
          <svg aria-hidden viewBox="0 0 16 16" fill="none" style={{ width: 12, height: 12 }}>
            <path d="M2.5 8.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 16 16" fill="none" style={{ width: 12, height: 12 }}>
            <rect x="5.5" y="1.5" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M3.5 4.5H2A1.5 1.5 0 0 0 .5 6v8A1.5 1.5 0 0 0 2 15.5h7A1.5 1.5 0 0 0 10.5 14v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        <span>{copied ? "Copied!" : "Copy"}</span>
      </button>
      <style jsx>{`
        .copyable-hex {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          max-width: 100%;
          min-width: 0;
        }

        .copyable-hex__value {
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 13px;
          font-weight: 600;
        }

        .copyable-hex__button {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid rgba(78, 54, 32, 0.18);
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--ink);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        @media (max-width: 600px) {
          .copyable-hex__value {
            max-width: 14ch;
          }
        }
      `}</style>
    </span>
  );
}
