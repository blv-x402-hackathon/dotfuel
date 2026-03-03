"use client";

import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  if (isConnected) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div>EOA: {address}</div>
        <div>Chain ID: {chainId}</div>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {connectors.map((connector) => (
        <button key={connector.uid} onClick={() => connect({ connector })}>
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
