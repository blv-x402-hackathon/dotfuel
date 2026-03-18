"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther, formatUnits, getAddress, parseAbi } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { CopyableHex } from "@/components/CopyableHex";
import { useCounterfactualAddress } from "@/hooks/useCounterfactualAddress";

const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]);

interface BalanceSnapshot {
  eoaPas: bigint;
  smartAccountToken: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
  refreshedAt: number;
}

function formatAmount(value: bigint, decimals: number, maxFractionDigits: number) {
  const rendered = formatUnits(value, decimals);
  const [whole, fraction = ""] = rendered.split(".");

  if (fraction.length === 0) {
    return whole;
  }

  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function BalancePanel({ refreshKey }: { refreshKey: number }) {
  const { address: eoaAddress } = useAccount();
  const publicClient = usePublicClient();
  const { address: smartAccountAddress, status: smartAccountStatus, error: smartAccountError } = useCounterfactualAddress();

  const [snapshot, setSnapshot] = useState<BalanceSnapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<BalanceSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualRefreshKey, setManualRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef<BalanceSnapshot | null>(null);

  useEffect(() => {
    async function run() {
      if (!eoaAddress || !publicClient || !smartAccountAddress) {
        setSnapshot(null);
        setPreviousSnapshot(null);
        setError(null);
        snapshotRef.current = null;
        return;
      }

      const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS;
      if (!tokenAddress) {
        setSnapshot(null);
        setPreviousSnapshot(null);
        setError("Set NEXT_PUBLIC_TOKEN_ADDRESS");
        snapshotRef.current = null;
        return;
      }

      setIsRefreshing(true);
      setError(null);

      try {
        const [eoaPas, smartAccountToken, tokenDecimals, tokenSymbol] = await Promise.all([
          publicClient.getBalance({ address: eoaAddress }),
          publicClient.readContract({
            address: getAddress(tokenAddress as `0x${string}`),
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [smartAccountAddress]
          }),
          publicClient.readContract({
            address: getAddress(tokenAddress as `0x${string}`),
            abi: erc20Abi,
            functionName: "decimals"
          }),
          publicClient.readContract({
            address: getAddress(tokenAddress as `0x${string}`),
            abi: erc20Abi,
            functionName: "symbol"
          })
        ]);

        const nextSnapshot: BalanceSnapshot = {
          eoaPas,
          smartAccountToken,
          tokenDecimals,
          tokenSymbol,
          refreshedAt: Date.now()
        };

        setPreviousSnapshot(snapshotRef.current);
        snapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to refresh balances");
      } finally {
        setIsRefreshing(false);
      }
    }

    run();
  }, [eoaAddress, manualRefreshKey, publicClient, refreshKey, smartAccountAddress]);

  const tokenSymbol = snapshot?.tokenSymbol ?? "Token";
  const pasValue = snapshot ? formatAmount(snapshot.eoaPas, 18, 4) : null;
  const previousPasValue = previousSnapshot ? formatAmount(previousSnapshot.eoaPas, 18, 4) : null;
  const tokenValue = snapshot ? formatAmount(snapshot.smartAccountToken, snapshot.tokenDecimals, 4) : null;
  const previousTokenValue = previousSnapshot
    ? formatAmount(previousSnapshot.smartAccountToken, previousSnapshot.tokenDecimals, 4)
    : null;
  const pasDelta = snapshot && previousSnapshot
    ? formatEther(snapshot.eoaPas - previousSnapshot.eoaPas)
    : null;
  const tokenDelta = snapshot && previousSnapshot
    ? formatAmount(snapshot.smartAccountToken - previousSnapshot.smartAccountToken, snapshot.tokenDecimals, 4)
    : null;
  const isGasless = snapshot ? snapshot.eoaPas === 0n : false;
  const pasBadgeClass = snapshot ? (isGasless ? "badge badge--success" : "badge badge--neutral") : "badge badge--neutral";
  const pasBadgeLabel = snapshot
    ? (isGasless ? "Gasless ✓" : `${formatAmount(snapshot.eoaPas, 18, 4)} PAS`)
    : "Pending";

  return (
    <section className="card card--data">
      <div className="card-header">
        <div>
          <h2 className="card-title">Live Balances</h2>
          <p className="card-subtitle">
            Capture the before/after proof that the EOA stays at zero PAS while the smart account settles in token
            mode.
          </p>
        </div>
        <button className="button button--ghost" disabled={isRefreshing} onClick={() => setManualRefreshKey((current) => current + 1)}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {smartAccountStatus === "error" ? <div className="feedback">{smartAccountError}</div> : null}
      {error ? <div className="feedback">{error}</div> : null}

      <div className="balance-grid">
        <article className="balance-card">
          <div className="balance-card__head">
            <span className="label">EOA Native</span>
            <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
              <span className={pasBadgeClass}>{pasBadgeLabel}</span>
              {snapshot ? (
                <span style={{ maxWidth: "21ch", color: "var(--muted)", fontSize: 12, textAlign: "right" }}>
                  {isGasless ? "This is the magic: no native gas needed." : "Native gas is available on this wallet."}
                </span>
              ) : null}
            </div>
          </div>
          <div className="balance-card__value">{pasValue ? `${pasValue} PAS` : "Connect wallet"}</div>
          <div className="balance-card__meta">
            {previousPasValue ? `Before: ${previousPasValue} PAS` : "Waiting for first refresh"}
          </div>
          <div className="balance-card__meta">
            {pasDelta ? `Delta: ${pasDelta} PAS` : "Target state: keep native gas at zero"}
          </div>
        </article>

        <article className="balance-card">
          <div className="balance-card__head">
            <span className="label">Smart Account Token</span>
            <span className="badge badge--success">{tokenSymbol}</span>
          </div>
          <div className="balance-card__value">{tokenValue ? `${tokenValue} ${tokenSymbol}` : "Awaiting account"}</div>
          <div className="balance-card__meta">
            {previousTokenValue ? `Before: ${previousTokenValue} ${tokenSymbol}` : "Refresh after a UserOperation"}
          </div>
          <div className="balance-card__meta">
            {tokenDelta ? `Delta: ${tokenDelta} ${tokenSymbol}` : "Watch tUSDT move only on token mode"}
          </div>
        </article>
      </div>

      <div className="balance-footer">
        <span className="label">Smart Account</span>
        <CopyableHex value={smartAccountAddress} fallback="Not derived yet" />
      </div>
      <div className="balance-footer">
        <span className="label">Last Refreshed</span>
        <span className="value">
          {snapshot ? new Date(snapshot.refreshedAt).toLocaleTimeString() : isRefreshing ? "Refreshing..." : "Pending"}
        </span>
      </div>
    </section>
  );
}
