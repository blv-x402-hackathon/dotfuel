"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";

import { useWalletModal } from "@/components/WalletContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { polkadotHubTestnet } from "@/lib/chains";

const RECENT_CONNECTOR_KEY = "dotfuel-recent-connector";

function getRecentConnectorId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(RECENT_CONNECTOR_KEY); } catch { return null; }
}

function saveRecentConnectorId(id: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(RECENT_CONNECTOR_KEY, id); } catch {}
}

function connectorIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("metamask")) {
    return (
      <svg viewBox="0 0 32 32" fill="none" className="wallet-modal__icon">
        <rect width="32" height="32" rx="8" fill="#F6851B" />
        <path d="M22.5 8l-5.3 3.9 1-2.3L22.5 8z" fill="#E2761B" stroke="#E2761B" strokeWidth=".2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 8l5.2 4-1-2.4L9.5 8zM21.2 19.8l-1.4 2.1 3 .8.9-2.9h-2.5zM8.3 19.8l.8 2.9 3-.8-1.4-2.1H8.3z" fill="#E4761B" stroke="#E4761B" strokeWidth=".2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.6 14.8l-.8 1.3 3 .1-.1-3.2-2.1 1.8zM18.4 14.8l-2.2-1.9-.1 3.3 3-.1-.7-1.3z" fill="#E4761B" stroke="#E4761B" strokeWidth=".2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.6 21.9l1.8-.9-1.6-1.2-.2 2.1zM16.6 21l1.8.9-.2-2.1-1.6 1.2z" fill="#E4761B" stroke="#E4761B" strokeWidth=".2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (n.includes("walletconnect")) {
    return (
      <svg viewBox="0 0 32 32" fill="none" className="wallet-modal__icon">
        <rect width="32" height="32" rx="8" fill="#3B99FC" />
        <path d="M11.6 13.4c2.4-2.4 6.4-2.4 8.8 0l.3.3c.1.1.1.3 0 .4l-1 1c-.1.1-.2.1-.2 0l-.4-.4c-1.7-1.7-4.5-1.7-6.2 0l-.5.4c-.1.1-.2.1-.2 0l-1-1c-.1-.1-.1-.3 0-.4l.4-.3zm10.9 2l.9.9c.1.1.1.3 0 .4l-4 4c-.1.1-.3.1-.4 0l-2.8-2.9c0-.1-.1-.1-.1 0L13.3 20.7c-.1.1-.3.1-.4 0l-4-4c-.1-.1-.1-.3 0-.4l.9-.9c.1-.1.3-.1.4 0l2.8 2.9c.1.1.1.1.2 0l2.8-2.9c.1-.1.3-.1.4 0l2.9 2.9c0 .1.1.1.1 0l2.8-2.9c.1-.1.3-.1.5 0z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" fill="none" className="wallet-modal__icon">
      <rect width="32" height="32" rx="8" fill="var(--muted)" fillOpacity=".2" />
      <path d="M16 10a6 6 0 0 1 6 6v4H10v-4a6 6 0 0 1 6-6z" stroke="var(--muted)" strokeWidth="1.5" fill="none" />
      <rect x="9" y="19" width="14" height="3" rx="1.5" fill="var(--muted)" fillOpacity=".3" />
    </svg>
  );
}

export function WalletModal() {
  const { isModalOpen, closeModal } = useWalletModal();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending, error, reset } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [recentConnectorId, setRecentConnectorId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(isModalOpen);

  const isWrongNetwork = isConnected && chainId !== polkadotHubTestnet.id;

  useEffect(() => {
    setRecentConnectorId(getRecentConnectorId());
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      setConnectingId(null);
      reset();
    }
  }, [isModalOpen, reset]);

  useEffect(() => {
    if (!isModalOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [closeModal, isModalOpen]);

  // Auto-close modal when wallet is connected and on correct network
  useEffect(() => {
    if (isConnected && !isWrongNetwork && isModalOpen) {
      closeModal();
    }
  }, [isConnected, isWrongNetwork, isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  return (
    <div
      className="wallet-modal__overlay"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) closeModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Connect wallet"
    >
      <div className="wallet-modal" ref={focusTrapRef as React.RefObject<HTMLDivElement>}>
        <div className="wallet-modal__header">
          <h2 className="wallet-modal__title">
            {isWrongNetwork ? "Switch Network" : "Connect Wallet"}
          </h2>
          <button className="wallet-modal__close" onClick={closeModal} type="button" aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {isWrongNetwork ? (
          <>
            <p className="wallet-modal__description">
              DotFuel requires the <strong>Polkadot Hub TestNet</strong> (Chain ID{" "}
              {polkadotHubTestnet.id}). Your wallet is connected to a different network.
            </p>
            <div className="wallet-modal__network-banner">
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden style={{ flex: "none" }}>
                <circle cx="10" cy="10" r="9" stroke="var(--warning)" strokeWidth="1.4" />
                <path d="M10 6v5M10 13v1" stroke="var(--warning)" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span>Wrong network detected</span>
            </div>
            <button
              className="wallet-modal__switch-btn"
              disabled={isSwitching}
              onClick={() => switchChain({ chainId: polkadotHubTestnet.id })}
              type="button"
            >
              {isSwitching ? (
                <span className="wallet-modal__spinner" />
              ) : (
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden>
                  <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              Switch to Polkadot Hub TestNet
            </button>
          </>
        ) : (
          <>
            <p className="wallet-modal__description">
              Choose a wallet to connect to DotFuel.
            </p>
            <ul className="wallet-modal__list">
              {connectors.map((connector) => {
                const isConnecting = isPending && connectingId === connector.uid;
                const isRecent = connector.uid === recentConnectorId;
                return (
                  <li key={connector.uid}>
                    <button
                      className={`wallet-modal__connector ${isConnecting ? "wallet-modal__connector--connecting" : ""}`}
                      disabled={isPending}
                      onClick={() => {
                        setConnectingId(connector.uid);
                        connect(
                          { connector },
                          {
                            onSuccess: () => {
                              saveRecentConnectorId(connector.uid);
                              closeModal();
                            }
                          }
                        );
                      }}
                      type="button"
                    >
                      {connectorIcon(connector.name)}
                      <span className="wallet-modal__connector-name">{connector.name}</span>
                      {isRecent && !isConnecting ? (
                        <span className="wallet-modal__recent-badge">Recent</span>
                      ) : isConnecting ? (
                        <span className="wallet-modal__spinner" />
                      ) : (
                        <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, opacity: 0.4 }}>
                          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {error ? (
              <div className="wallet-modal__error">
                <strong>Connection failed</strong>
                <p>{error.message.length > 120 ? `${error.message.slice(0, 120)}...` : error.message}</p>
              </div>
            ) : null}
          </>
        )}
      </div>
      <style jsx>{`
        .wallet-modal__overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(36, 24, 14, 0.42);
          backdrop-filter: blur(6px);
          animation: modalOverlayIn 180ms ease;
        }

        .wallet-modal {
          width: min(420px, 100%);
          padding: 24px;
          border-radius: 24px;
          border: 1px solid var(--line);
          background: var(--card-strong);
          box-shadow: 0 24px 60px rgba(40, 24, 10, 0.28);
          animation: modalIn 220ms ease;
        }

        .wallet-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .wallet-modal__title {
          margin: 0;
          font-family: var(--font-serif), "Palatino Linotype", serif;
          font-size: 22px;
          letter-spacing: -0.03em;
        }

        .wallet-modal__close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          transition: background 120ms ease;
        }

        .wallet-modal__close:hover {
          background: rgba(36, 24, 14, 0.06);
        }

        .wallet-modal__description {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }

        .wallet-modal__network-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(217, 119, 6, 0.25);
          background: rgba(217, 119, 6, 0.08);
          color: var(--warning);
          font-size: 13px;
          font-weight: 600;
        }

        .wallet-modal__switch-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid var(--accent-border);
          background: var(--accent);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 120ms ease;
        }

        .wallet-modal__switch-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .wallet-modal__list {
          display: grid;
          gap: 8px;
          margin: 18px 0 0;
          padding: 0;
          list-style: none;
        }

        .wallet-modal__connector {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 16px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--card);
          color: var(--ink);
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
        }

        .wallet-modal__connector:hover:not(:disabled) {
          border-color: rgba(199, 90, 46, 0.36);
          background: rgba(199, 90, 46, 0.06);
          transform: translateY(-1px);
        }

        .wallet-modal__connector:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .wallet-modal__connector--connecting {
          border-color: rgba(199, 90, 46, 0.36);
          background: rgba(199, 90, 46, 0.06);
        }

        .wallet-modal__connector-name {
          flex: 1;
          text-align: left;
        }

        .wallet-modal__recent-badge {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 3px 8px;
          border-radius: 999px;
          background: var(--accent-hover);
          border: 1px solid var(--accent-border);
          color: var(--accent-strong);
        }

        .wallet-modal__spinner {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(199, 90, 46, 0.25);
          border-top-color: var(--accent);
          animation: modalSpin 700ms linear infinite;
        }

        .wallet-modal__error {
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(181, 67, 48, 0.2);
          background: rgba(181, 67, 48, 0.08);
          color: var(--danger);
          font-size: 13px;
        }

        .wallet-modal__error strong {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .wallet-modal__error p {
          margin: 0;
          line-height: 1.45;
        }

        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes modalSpin {
          to { transform: rotate(360deg); }
        }

        @media (prefers-color-scheme: dark) {
          :global(html:not([data-theme="light"])) .wallet-modal__close:hover { background: rgba(240, 230, 216, 0.08); }
        }

        :global(html[data-theme="dark"]) .wallet-modal__close:hover { background: rgba(240, 230, 216, 0.08); }

        @media (max-width: 480px) {
          .wallet-modal__overlay {
            align-items: flex-end;
            padding: 0;
          }

          .wallet-modal {
            width: 100%;
            border-radius: 24px 24px 0 0;
            padding: 24px 20px calc(20px + env(safe-area-inset-bottom, 0px));
            animation: modalInMobile 240ms ease;
          }
        }

        @keyframes modalInMobile {
          from {
            opacity: 0;
            transform: translateY(40px);
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
