"use client";

import { useEffect, useState } from "react";

function truncateHex(value: string) {
  if (!value.startsWith("0x") || value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
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
        type="button"
      >
        {copied ? "Copied!" : "Copy"}
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
          border: 1px solid rgba(78, 54, 32, 0.18);
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.72);
          color: var(--ink);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
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
