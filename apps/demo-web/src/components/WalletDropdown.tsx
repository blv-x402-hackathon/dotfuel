"use client";

import { formatEther } from "viem";
import { useAccount, useChainId, useConnect, useDisconnect, usePublicClient } from "wagmi";
import { useEffect, useState } from "react";

import { CopyableHex } from "@/components/CopyableHex";
import { useWalletModal } from "@/components/WalletContext";
import { useCounterfactualAddress } from "@/hooks/useCounterfactualAddress";

export function WalletDropdown({ onClose }: { onClose: () => void }) {
  const { address, connector } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { openModal } = useWalletModal();
  const publicClient = usePublicClient();
  const { address: smartAccountAddress, status: saStatus } = useCounterfactualAddress();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!address || !publicClient) return;
    let cancelled = false;
    publicClient.getBalance({ address }).then((b) => {
      if (!cancelled) setBalance(b);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [address, publicClient]);

  useEffect(() => {
    if (!smartAccountAddress || !publicClient) {
      setIsDeployed(null);
      return;
    }
    let cancelled = false;
    publicClient.getBytecode({ address: smartAccountAddress }).then((code) => {
      if (!cancelled) setIsDeployed(Boolean(code && code !== "0x"));
    }).catch(() => {
      if (!cancelled) setIsDeployed(null);
    });
    return () => { cancelled = true; };
  }, [smartAccountAddress, publicClient]);

  const balanceLabel = balance !== null
    ? `${Number(formatEther(balance)).toFixed(6)} PAS`
    : "Loading...";

  const explorerBaseUrl = "https://blockscout-testnet.polkadot.io";

  return (
    <div className="wallet-dropdown">
      {connector ? (
        <div className="wallet-dropdown__connector-row">
          <span className="wallet-dropdown__connector-label">Connected via {connector.name}</span>
          <button
            className="wallet-dropdown__switch"
            type="button"
            onClick={() => { onClose(); openModal(); }}
          >
            Switch Wallet
          </button>
        </div>
      ) : null}

      <div className="wallet-dropdown__section">
        <span className="wallet-dropdown__label">Wallet</span>
        <CopyableHex value={address ?? null} />
      </div>

      <div className="wallet-dropdown__section">
        <span className="wallet-dropdown__label">Network</span>
        <span className="wallet-dropdown__value">Polkadot Hub TestNet</span>
        <span className="wallet-dropdown__meta">
          Chain ID: {chainId}
          {" · "}
          <a
            href={`${explorerBaseUrl}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="wallet-dropdown__explorer-link"
          >
            View on Blockscout ↗
          </a>
        </span>
      </div>

      <div className="wallet-dropdown__section">
        <span className="wallet-dropdown__label">Native Balance</span>
        <span className="wallet-dropdown__value">{balanceLabel}</span>
        {balance !== null && balance === 0n ? (
          <span className="wallet-dropdown__badge wallet-dropdown__badge--success">Gasless</span>
        ) : null}
      </div>

      <div className="wallet-dropdown__section">
        <span className="wallet-dropdown__label">Smart Account</span>
        {saStatus === "loading" ? (
          <span className="wallet-dropdown__meta">Deriving...</span>
        ) : smartAccountAddress ? (
          <>
            <CopyableHex value={smartAccountAddress} />
            <span className={`wallet-dropdown__badge ${isDeployed ? "wallet-dropdown__badge--success" : "wallet-dropdown__badge--neutral"}`}>
              {isDeployed === null ? "Checking..." : isDeployed ? "Deployed" : "Not deployed"}
            </span>
          </>
        ) : (
          <span className="wallet-dropdown__meta">Not available</span>
        )}
      </div>

      <div className="wallet-dropdown__divider" />

      <button
        className="wallet-dropdown__disconnect"
        onClick={() => {
          disconnect();
          onClose();
        }}
        type="button"
      >
        Disconnect
      </button>

      <style jsx>{`
        .wallet-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 60;
          width: min(360px, calc(100vw - 32px));
          padding: 16px;
          border-radius: 20px;
          border: 1px solid var(--line);
          background: var(--card-strong);
          box-shadow: 0 20px 48px rgba(40, 24, 10, 0.22);
          animation: dropdownIn 160ms ease;
        }

        .wallet-dropdown__connector-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--line);
          margin-bottom: 4px;
        }

        .wallet-dropdown__connector-label {
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
        }

        .wallet-dropdown__switch {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent-strong);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
          transition: background 100ms ease;
        }

        .wallet-dropdown__switch:hover {
          background: var(--accent-hover);
        }

        .wallet-dropdown__explorer-link {
          color: var(--accent-strong);
          text-decoration: none;
          font-weight: 600;
        }

        .wallet-dropdown__explorer-link:hover {
          text-decoration: underline;
        }

        .wallet-dropdown__section {
          display: grid;
          gap: 4px;
          padding: 10px 0;
        }

        .wallet-dropdown__section:not(:first-child) {
          border-top: 1px solid var(--line);
        }

        .wallet-dropdown__label {
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .wallet-dropdown__value {
          font-size: 14px;
          font-weight: 600;
        }

        .wallet-dropdown__meta {
          color: var(--muted);
          font-size: 12px;
        }

        .wallet-dropdown__badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .wallet-dropdown__badge--success {
          background: rgba(12, 122, 92, 0.12);
          color: var(--success);
        }

        .wallet-dropdown__badge--neutral {
          background: rgba(36, 24, 14, 0.08);
          color: var(--muted);
        }

        .wallet-dropdown__divider {
          height: 1px;
          margin: 8px 0;
          background: var(--line);
        }

        .wallet-dropdown__disconnect {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 10px;
          border: 1px solid rgba(181, 67, 48, 0.2);
          border-radius: 12px;
          background: rgba(181, 67, 48, 0.06);
          color: var(--danger);
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 120ms ease;
        }

        .wallet-dropdown__disconnect:hover {
          background: rgba(181, 67, 48, 0.12);
        }

        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
