"use client";

import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  if (isConnected) {
    return (
      <section className="card">
        <h2 className="card-title">Wallet Session</h2>
        <p className="card-subtitle">Connected signer used for Permit2 and UserOperation signatures.</p>
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="wallet-line">
            <span className="label">EOA</span>
            <span className="value">{address}</span>
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
    <section className="card">
      <h2 className="card-title">Wallet Session</h2>
      <p className="card-subtitle">Connect the EOA that will sign the paymaster quote and UserOperation.</p>
      <div className="button-row" style={{ marginTop: 16 }}>
        {connectors.map((connector) => (
          <button className="button" key={connector.uid} onClick={() => connect({ connector })}>
            Connect {connector.name}
          </button>
        ))}
      </div>
    </section>
  );
}
