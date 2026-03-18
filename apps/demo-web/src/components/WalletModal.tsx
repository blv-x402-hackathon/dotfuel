"use client";

import { useEffect, useRef, useState } from "react";
import { useConnect } from "wagmi";

import { useWalletModal } from "@/components/WalletContext";

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
  const { connectors, connect, isPending, error, reset } = useConnect();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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
      <div className="wallet-modal">
        <div className="wallet-modal__header">
          <h2 className="wallet-modal__title">Connect Wallet</h2>
          <button className="wallet-modal__close" onClick={closeModal} type="button" aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="wallet-modal__description">Choose a wallet to connect to DotFuel.</p>
        <ul className="wallet-modal__list">
          {connectors.map((connector) => {
            const isConnecting = isPending && connectingId === connector.uid;
            return (
              <li key={connector.uid}>
                <button
                  className={`wallet-modal__connector ${isConnecting ? "wallet-modal__connector--connecting" : ""}`}
                  disabled={isPending}
                  onClick={() => {
                    setConnectingId(connector.uid);
                    connect(
                      { connector },
                      { onSuccess: () => closeModal() }
                    );
                  }}
                  type="button"
                >
                  {connectorIcon(connector.name)}
                  <span className="wallet-modal__connector-name">{connector.name}</span>
                  {isConnecting ? (
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
      `}</style>
    </div>
  );
}
