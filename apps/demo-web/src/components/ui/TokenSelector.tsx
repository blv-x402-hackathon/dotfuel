"use client";

import { useEffect, useRef, useState } from "react";

export interface TokenOption {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  balance?: bigint;
  balanceLabel?: string;
  /** true if this token cannot be selected (e.g. zero/insufficient balance) */
  disabled?: boolean;
}

interface TokenSelectorProps {
  tokens: TokenOption[];
  selected: TokenOption | null;
  onChange: (token: TokenOption) => void;
  label?: string;
  disabled?: boolean;
}

export function TokenSelector({ tokens, selected, onChange, label = "Token", disabled }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <div className="token-selector" ref={containerRef}>
      {label ? <span className="label">{label}</span> : null}
      <button
        className={`token-selector__trigger ${open ? "token-selector__trigger--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
        disabled={disabled || tokens.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Select token, currently ${selected?.symbol ?? "none"}`}
      >
        {selected ? (
          <>
            <span className="token-selector__symbol-badge" aria-hidden>
              {selected.symbol.slice(0, 1)}
            </span>
            <span className="token-selector__name">
              {selected.symbol}
              <span className="token-selector__full-name">{selected.name}</span>
            </span>
            {selected.balanceLabel ? (
              <span className="token-selector__balance">{selected.balanceLabel}</span>
            ) : null}
          </>
        ) : (
          <span className="token-selector__placeholder">Select token</span>
        )}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          width="14"
          height="14"
          aria-hidden
          className="token-selector__chevron"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <ul className="token-selector__list" role="listbox" aria-label="Available tokens">
          {tokens.map((token) => {
            const isSelected = selected?.address === token.address;
            return (
              <li key={token.address} role="option" aria-selected={isSelected}>
                <button
                  className={`token-selector__option ${isSelected ? "token-selector__option--selected" : ""} ${token.disabled ? "token-selector__option--disabled" : ""}`}
                  disabled={token.disabled}
                  onClick={() => {
                    if (!token.disabled) {
                      onChange(token);
                      setOpen(false);
                    }
                  }}
                  type="button"
                >
                  <span className="token-selector__symbol-badge" aria-hidden>
                    {token.symbol.slice(0, 1)}
                  </span>
                  <span className="token-selector__option-info">
                    <span className="token-selector__option-symbol">{token.symbol}</span>
                    <span className="token-selector__option-name">{token.name}</span>
                  </span>
                  {token.balanceLabel ? (
                    <span className={`token-selector__option-balance ${token.disabled ? "token-selector__option-balance--warn" : ""}`}>
                      {token.balanceLabel}
                      {token.disabled ? " (insufficient)" : ""}
                    </span>
                  ) : null}
                  {isSelected ? (
                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden>
                      <path d="M3 8l4 4 6-7" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <style jsx>{`
        .token-selector {
          display: grid;
          gap: 6px;
          position: relative;
        }

        .token-selector__trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--line);
          background: var(--card-strong);
          color: var(--ink);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: border-color 120ms ease, background 120ms ease;
          text-align: left;
        }

        .token-selector__chevron {
          margin-left: auto;
          flex-shrink: 0;
          transition: transform 160ms ease;
        }

        .token-selector__trigger:hover:not(:disabled) {
          border-color: var(--accent-border);
          background: var(--accent-hover);
        }

        .token-selector__trigger--open {
          border-color: var(--accent-border);
          background: var(--accent-hover);
        }

        .token-selector__trigger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .token-selector__symbol-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: var(--accent);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          flex: none;
        }

        .token-selector__name {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
          min-width: 0;
        }

        .token-selector__full-name {
          display: block;
          font-size: 11px;
          font-weight: 400;
          color: var(--muted);
        }

        .token-selector__balance {
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
        }

        .token-selector__placeholder {
          color: var(--muted);
          font-weight: 400;
        }

        .token-selector__list {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 50;
          padding: 6px;
          margin: 0;
          list-style: none;
          border-radius: var(--radius-md);
          border: 1px solid var(--line);
          background: var(--card-strong);
          box-shadow: var(--shadow-lg);
          animation: tokenListIn 160ms ease;
        }

        .token-selector__option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--ink);
          font-size: 14px;
          cursor: pointer;
          transition: background 100ms ease;
          text-align: left;
        }

        .token-selector__option:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .token-selector__option--selected {
          background: rgba(199, 90, 46, 0.06);
        }

        .token-selector__option--disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .token-selector__option-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
          min-width: 0;
        }

        .token-selector__option-symbol {
          font-weight: 700;
          font-size: 14px;
        }

        .token-selector__option-name {
          font-size: 11px;
          color: var(--muted);
          font-weight: 400;
        }

        .token-selector__option-balance {
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
        }

        .token-selector__option-balance--warn {
          color: var(--warning);
        }

        @keyframes tokenListIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-color-scheme: dark) {
          .token-selector__list {
            background: rgba(28, 22, 16, 0.98);
          }
        }
      `}</style>
    </div>
  );
}
