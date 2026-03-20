"use client";

import { useEffect, useRef, useState } from "react";
import { formatUnits, getAddress, parseAbi } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { Skeleton } from "@/components/ui/Skeleton";
import { useCounterfactualAddress } from "@/hooks/useCounterfactualAddress";

const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]);

const parsedFallbackTokenDecimals = Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS ?? "6");
const fallbackTokenDecimals = Number.isFinite(parsedFallbackTokenDecimals) && parsedFallbackTokenDecimals >= 0
  ? Math.floor(parsedFallbackTokenDecimals)
  : 6;
const fallbackTokenSymbol = process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? "tUSDT";

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

function useAnimatedNumber(value: string | null) {
  const [rendered, setRendered] = useState(value);
  const previousNumberRef = useRef<number | null>(value ? Number(value) : null);

  useEffect(() => {
    if (!value) {
      setRendered(value);
      previousNumberRef.current = null;
      return;
    }

    const nextNumber = Number(value);
    if (!Number.isFinite(nextNumber)) {
      setRendered(value);
      return;
    }

    const previousNumber = previousNumberRef.current;
    previousNumberRef.current = nextNumber;
    if (previousNumber === null || Math.abs(previousNumber - nextNumber) < Number.EPSILON) {
      setRendered(value);
      return;
    }

    const decimalCount = value.includes(".") ? Math.min(4, value.split(".")[1]?.length ?? 0) : 0;
    const startedAt = performance.now();
    const duration = 420;
    let animationFrame = 0;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const current = previousNumber + (nextNumber - previousNumber) * eased;
      setRendered(current.toLocaleString(undefined, { maximumFractionDigits: decimalCount }));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      } else {
        setRendered(value);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return rendered;
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
  const [now, setNow] = useState(Date.now());
  const [highlight, setHighlight] = useState(false);
  const snapshotRef = useRef<BalanceSnapshot | null>(null);
  const prevRefreshKey = useRef(refreshKey);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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
        const tokenAddressOnChain = getAddress(tokenAddress as `0x${string}`);
        const [eoaPasResult, smartAccountTokenResult, tokenDecimalsResult, tokenSymbolResult] = await Promise.allSettled([
          publicClient.getBalance({ address: eoaAddress }),
          publicClient.readContract({
            address: tokenAddressOnChain,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [smartAccountAddress]
          }),
          publicClient.readContract({
            address: tokenAddressOnChain,
            abi: erc20Abi,
            functionName: "decimals"
          }),
          publicClient.readContract({
            address: tokenAddressOnChain,
            abi: erc20Abi,
            functionName: "symbol"
          })
        ]);

        if (eoaPasResult.status !== "fulfilled") {
          throw eoaPasResult.reason;
        }
        if (smartAccountTokenResult.status !== "fulfilled") {
          throw smartAccountTokenResult.reason;
        }

        const tokenDecimals = tokenDecimalsResult.status === "fulfilled"
          ? Number(tokenDecimalsResult.value)
          : fallbackTokenDecimals;
        const safeTokenDecimals = Number.isFinite(tokenDecimals) && tokenDecimals >= 0
          ? Math.floor(tokenDecimals)
          : fallbackTokenDecimals;
        const tokenSymbol = tokenSymbolResult.status === "fulfilled"
          ? tokenSymbolResult.value
          : fallbackTokenSymbol;
        const safeTokenSymbol = tokenSymbol.trim() ? tokenSymbol : fallbackTokenSymbol;

        const nextSnapshot: BalanceSnapshot = {
          eoaPas: eoaPasResult.value,
          smartAccountToken: smartAccountTokenResult.value,
          tokenDecimals: safeTokenDecimals,
          tokenSymbol: safeTokenSymbol,
          refreshedAt: Date.now()
        };

        const hadPrevious = snapshotRef.current !== null;
        const changed =
          hadPrevious &&
          (snapshotRef.current!.smartAccountToken !== nextSnapshot.smartAccountToken ||
            snapshotRef.current!.eoaPas !== nextSnapshot.eoaPas);

        setPreviousSnapshot(snapshotRef.current);
        snapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);

        // Flash highlight when values change after an external refresh
        if (changed && prevRefreshKey.current !== refreshKey) {
          prevRefreshKey.current = refreshKey;
          setHighlight(true);
          setTimeout(() => setHighlight(false), 2000);
        }
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
  const tokenValue = snapshot ? formatAmount(snapshot.smartAccountToken, snapshot.tokenDecimals, 4) : null;
  const animatedPasValue = useAnimatedNumber(pasValue);
  const animatedTokenValue = useAnimatedNumber(tokenValue);
  const pasDeltaRaw = snapshot && previousSnapshot
    ? snapshot.eoaPas - previousSnapshot.eoaPas
    : null;
  const pasDelta = pasDeltaRaw !== null
    ? formatAmount(pasDeltaRaw < 0n ? -pasDeltaRaw : pasDeltaRaw, 18, 6)
    : null;
  const pasDeltaSign = pasDeltaRaw !== null && pasDeltaRaw > 0n ? "+" : pasDeltaRaw !== null && pasDeltaRaw < 0n ? "-" : "";
  const tokenDeltaRaw = snapshot && previousSnapshot
    ? snapshot.smartAccountToken - previousSnapshot.smartAccountToken
    : null;
  const tokenDelta = tokenDeltaRaw !== null
    ? formatAmount(tokenDeltaRaw < 0n ? -tokenDeltaRaw : tokenDeltaRaw, snapshot!.tokenDecimals, 6)
    : null;
  const tokenDeltaSign = tokenDeltaRaw !== null && tokenDeltaRaw > 0n ? "+" : tokenDeltaRaw !== null && tokenDeltaRaw < 0n ? "-" : "";
  const isGasless = snapshot ? snapshot.eoaPas === 0n : false;
  const pasBadgeClass = snapshot ? (isGasless ? "badge badge--success" : "badge badge--neutral") : "badge badge--neutral";
  const pasBadgeLabel = snapshot
    ? (isGasless ? "Gasless ✓" : `${formatAmount(snapshot.eoaPas, 18, 4)} PAS`)
    : !eoaAddress
      ? "Connect wallet"
      : smartAccountStatus === "loading"
        ? "Awaiting account"
        : error
          ? "Unavailable"
          : "Pending";
  const nativeValueLabel = animatedPasValue
    ? `${animatedPasValue} PAS`
    : !eoaAddress
      ? "Connect wallet"
      : smartAccountStatus === "loading"
        ? "Awaiting account"
        : error
          ? "Unavailable"
          : "Pending";
  const tokenValueLabel = animatedTokenValue
    ? `${animatedTokenValue} ${tokenSymbol}`
    : !eoaAddress
      ? "Connect wallet"
      : smartAccountStatus === "loading"
        ? "Awaiting account"
        : error
          ? "Unavailable"
          : "Awaiting account";
  const refreshedLabel = snapshot
    ? `${Math.max(0, Math.floor((now - snapshot.refreshedAt) / 1000))}s ago`
    : isRefreshing
      ? "Refreshing..."
      : !eoaAddress
        ? "Connect wallet"
        : smartAccountStatus === "loading"
          ? "Awaiting account"
          : error
            ? "Unavailable"
            : "Not refreshed yet";

  return (
    <section className={`card card--data${highlight ? " card--highlight" : ""}`} id="balance-panel">
      <div className="card-header">
        <div>
          <h2 className="card-title">Balances</h2>
          <p className="card-subtitle">
            Your wallet and smart account balances, updated after each transaction.
          </p>
        </div>
        <button className="button button--ghost" disabled={isRefreshing} onClick={() => setManualRefreshKey((current) => current + 1)}>
          {isRefreshing ? <span className="button__spinner" aria-hidden /> : null}
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {smartAccountStatus === "error" ? <div className="feedback">{smartAccountError}</div> : null}
      {error ? <div className="feedback">{error}</div> : null}

      {!snapshot && isRefreshing ? (
        <div className="balance-grid">
          <article className="balance-card">
            <Skeleton height={14} width={100} />
            <Skeleton height={32} width="70%" variant="rect" />
            <Skeleton height={12} width={140} />
          </article>
          <article className="balance-card">
            <Skeleton height={14} width={120} />
            <Skeleton height={32} width="60%" variant="rect" />
            <Skeleton height={12} width={160} />
          </article>
        </div>
      ) : null}

      {(snapshot || !isRefreshing) ? <div className="balance-grid">
        <article className="balance-card">
          <div className="balance-card__head">
            <span className="label">Native Balance</span>
            <span className={pasBadgeClass}>{pasBadgeLabel}</span>
          </div>
          <div className="balance-card__value">{nativeValueLabel}</div>
          <div className="balance-card__meta">Used for network gas fees.</div>
          <div className={`balance-delta${pasDeltaRaw === 0n ? " balance-delta--dim" : ""}`}>
            <span className="balance-delta__label">Δ PAS</span>
            {pasDelta !== null ? (
              pasDeltaRaw === 0n
                ? <span className="balance-delta__value balance-delta__value--neutral">No change</span>
                : <span className={`balance-delta__value ${pasDeltaRaw! < 0n ? "balance-delta__value--neg" : "balance-delta__value--pos"}`}>{pasDeltaSign}{pasDelta} PAS</span>
            ) : (
              <span className="balance-delta__value balance-delta__value--empty">—</span>
            )}
          </div>
        </article>

        <article className="balance-card">
          <div className="balance-card__head">
            <span className="label">Smart Account Token</span>
            <span className="badge badge--success">{tokenSymbol}</span>
          </div>
          <div className="balance-card__value">{tokenValueLabel}</div>
          <div className="balance-card__meta">Deducted when paying gas with token.</div>
          <div className={`balance-delta${tokenDeltaRaw === 0n ? " balance-delta--dim" : ""}`}>
            <span className="balance-delta__label">Δ {tokenSymbol}</span>
            {tokenDelta !== null ? (
              tokenDeltaRaw === 0n
                ? <span className="balance-delta__value balance-delta__value--neutral">No change</span>
                : <span className={`balance-delta__value ${tokenDeltaRaw! < 0n ? "balance-delta__value--neg" : "balance-delta__value--pos"}`}>{tokenDeltaSign}{tokenDelta} {tokenSymbol}</span>
            ) : (
              <span className="balance-delta__value balance-delta__value--empty">—</span>
            )}
          </div>
        </article>
      </div> : null}

      <div className="balance-footer">
        <span className="label">Last Refreshed:</span>
        <span className={`value${highlight ? " balance-footer__updated" : ""}`}>
          {highlight ? "✓ Updated just now" : refreshedLabel}
        </span>
      </div>
    </section>
  );
}
