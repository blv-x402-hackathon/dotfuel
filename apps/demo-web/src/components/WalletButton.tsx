"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { WalletDropdown } from "@/components/WalletDropdown";
import { useWalletModal } from "@/components/WalletContext";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function addressToHue(address: string): string {
  const hex = address.slice(2, 8);
  const num = parseInt(hex, 16);
  const hue = num % 360;
  return `hsl(${hue}, 62%, 58%)`;
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { openModal } = useWalletModal();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isConnected || !address || !publicClient) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    publicClient.getBalance({ address }).then((b) => {
      if (!cancelled) setBalance(b);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [address, isConnected, publicClient]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setIsDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isDropdownOpen]);

  if (!isConnected || !address) {
    return (
      <button className="wallet-btn wallet-btn--connect" onClick={openModal} type="button">
        <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
          <path d="M13 4H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="10.5" cy="8" r="1" fill="currentColor" />
          <path d="M4 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        Connect Wallet
        <style jsx>{`
          .wallet-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 8px 16px;
            background: var(--card-strong);
            color: var(--ink);
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
            white-space: nowrap;
          }

          .wallet-btn:hover {
            border-color: rgba(199, 90, 46, 0.36);
            background: rgba(199, 90, 46, 0.06);
            transform: translateY(-1px);
          }

          .wallet-btn--connect {
            background: linear-gradient(135deg, var(--accent), var(--accent-strong));
            border-color: transparent;
            color: #fffaf2;
          }

          .wallet-btn--connect:hover {
            background: linear-gradient(135deg, var(--accent-strong), var(--accent));
            border-color: transparent;
            color: #fffaf2;
          }
        `}</style>
      </button>
    );
  }

  const balanceLabel = balance !== null
    ? `${Number(formatEther(balance)).toFixed(4)} PAS`
    : null;

  return (
    <div ref={wrapRef} className="wallet-btn-wrap">
      <button
        className="wallet-btn wallet-btn--connected"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        type="button"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <span
          className="wallet-btn__avatar"
          style={{ background: addressToHue(address) }}
          aria-hidden
        />
        <span className="wallet-btn__address">{truncateAddress(address)}</span>
        {balanceLabel ? <span className="wallet-btn__balance">{balanceLabel}</span> : null}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          style={{ width: 12, height: 12, transition: "transform 120ms ease", transform: isDropdownOpen ? "rotate(180deg)" : "none" }}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isDropdownOpen ? <WalletDropdown onClose={() => setIsDropdownOpen(false)} /> : null}
      <style jsx>{`
        .wallet-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 8px 16px;
          background: var(--card-strong);
          color: var(--ink);
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
          white-space: nowrap;
        }

        .wallet-btn:hover {
          border-color: rgba(199, 90, 46, 0.36);
          background: rgba(199, 90, 46, 0.06);
        }

        .wallet-btn--connected {
          padding: 6px 12px 6px 6px;
        }

        .wallet-btn__avatar {
          display: inline-flex;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          flex: none;
        }

        .wallet-btn__address {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 13px;
          font-weight: 600;
        }

        .wallet-btn__balance {
          color: var(--muted);
          font-size: 12px;
          font-weight: 500;
        }

        @media (max-width: 600px) {
          .wallet-btn__balance {
            display: none;
          }
        }

        .wallet-btn-wrap {
          position: relative;
        }
      `}</style>
    </div>
  );
}
