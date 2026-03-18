"use client";

import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";

import { CopyableHex } from "@/components/CopyableHex";

export function WalletConnect({ variant = "sidebar" }: { variant?: "sidebar" | "hero" }) {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  if (isConnected) {
    return (
      <section className={`card card--info ${variant === "hero" ? "wallet-connect--hero" : ""}`}>
        <h2 className="card-title">Wallet Session</h2>
        <p className="card-subtitle">Connected signer used for Permit2 and UserOperation signatures.</p>
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="wallet-line">
            <span className="label">EOA</span>
            <CopyableHex value={address} />
          </div>
          <div className="wallet-line">
            <span className="label">Chain ID</span>
            <span className="value value--accent">{chainId}</span>
          </div>
          <div className="button-row">
            <button className="button button--ghost" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`card card--info ${variant === "hero" ? "wallet-connect--hero" : ""}`}>
      <h2 className="card-title">{variant === "hero" ? "Connect Wallet to Start" : "Wallet Session"}</h2>
      <p className="card-subtitle">
        {variant === "hero"
          ? "Connect your wallet first to unlock token mode and sponsor mode demo actions."
          : "Connect the EOA that will sign the paymaster quote and UserOperation."}
      </p>
      <div className="button-row" style={{ marginTop: 16 }}>
        {connectors.map((connector) => (
          <button
            className={`button ${variant === "hero" ? "button--accent wallet-connect__pulse" : ""}`}
            key={connector.uid}
            onClick={() => connect({ connector })}
          >
            Connect {connector.name}
          </button>
        ))}
      </div>
      <style jsx>{`
        .wallet-connect--hero {
          margin-top: 18px;
        }

        .wallet-connect__pulse {
          animation: walletPulse 1.8s ease-in-out infinite;
        }

        @keyframes walletPulse {
          0%,
          100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 0 0 0 rgba(199, 90, 46, 0.4);
          }

          45% {
            transform: translateY(-1px) scale(1.01);
            box-shadow: 0 0 0 10px rgba(199, 90, 46, 0);
          }
        }
      `}</style>
    </section>
  );
}
