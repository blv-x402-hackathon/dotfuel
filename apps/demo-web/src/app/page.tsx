"use client";

import { useEffect, useMemo, useState } from "react";

import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { FlowTabs } from "@/components/FlowTabs";
import { LogoMark } from "@/components/LogoMark";
import { StepIndicator, type GuidedStep } from "@/components/StepIndicator";
import type { TxHistoryItem } from "@/components/TxHistory";
import { WalletConnect } from "@/components/WalletConnect";
import { useAccount, usePublicClient } from "wagmi";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [history, setHistory] = useState<TxHistoryItem[]>([]);
  const [preferredTab, setPreferredTab] = useState<"token" | "sponsor">("token");
  const [eoaBalance, setEoaBalance] = useState<bigint | null>(null);
  const [modeCount, setModeCount] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [claimLive, setClaimLive] = useState(false);

  useEffect(() => {
    let animationFrame = 0;
    const startedAt = performance.now();
    const run = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 1100);
      setModeCount(Math.round(progress * 2));
      setStepCount(Math.round(progress * 4));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(run);
      }
    };

    animationFrame = window.requestAnimationFrame(run);
    const claimTimer = window.setTimeout(() => setClaimLive(true), 420);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(claimTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchBalance() {
      if (!isConnected || !address || !publicClient) {
        setEoaBalance(null);
        return;
      }

      try {
        const nextBalance = await publicClient.getBalance({ address });
        if (!cancelled) {
          setEoaBalance(nextBalance);
        }
      } catch {
        if (!cancelled) {
          setEoaBalance(null);
        }
      }
    }

    fetchBalance();
    return () => {
      cancelled = true;
    };
  }, [address, history.length, isConnected, publicClient]);

  const steps = useMemo<GuidedStep[]>(() => {
    const hasTokenRun = history.some((item) => item.mode === "token");
    const hasSettlement = history.some((item) => Boolean(item.explorerUrl));
    const checkedNativeGas = isConnected && eoaBalance !== null;
    const doneFlags = [isConnected, checkedNativeGas, hasTokenRun, hasSettlement];
    const activeIndex = doneFlags.findIndex((flag) => !flag);

    return [
      {
        title: "Connect Wallet",
        description: isConnected ? "Wallet connected." : "Connect your EOA to start the demo.",
        status: doneFlags[0] ? "done" : activeIndex === 0 ? "active" : "locked"
      },
      {
        title: "Check 0 PAS",
        description: !isConnected
          ? "Available after wallet connection."
          : eoaBalance === null
            ? "Checking current native balance..."
            : eoaBalance === 0n
              ? "0 PAS confirmed."
              : "Native PAS detected. You can still continue.",
        status: doneFlags[1] ? "done" : activeIndex === 1 ? "active" : "locked"
      },
      {
        title: "Execute Token Mode",
        description: hasTokenRun ? "Token mode flow executed." : "Run Flow A to submit a UserOperation.",
        status: doneFlags[2] ? "done" : activeIndex === 2 ? "active" : "locked"
      },
      {
        title: "Verify Settlement",
        description: hasSettlement ? "Transaction confirmed on-chain." : "Open the latest transaction and verify settlement.",
        status: doneFlags[3] ? "done" : activeIndex === 3 || activeIndex === -1 ? "active" : "locked"
      }
    ];
  }, [eoaBalance, history, isConnected]);

  function handleQuickDemo() {
    if (!isConnected) {
      document.getElementById("wallet-connect-cta")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const hasTokenRun = history.some((item) => item.mode === "token");
    const hasSettlement = history.some((item) => Boolean(item.explorerUrl));
    if (!hasTokenRun) {
      setPreferredTab("token");
      document.getElementById("flow-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (!hasSettlement) {
      document.getElementById("tx-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    document.getElementById("tx-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="page-shell">
      <StepIndicator steps={steps} onQuickDemo={handleQuickDemo} />

      <section className="hero">
        <div className="hero-brand">
          <LogoMark className="hero-logo" />
          <div className="hero-brand-copy">
            <div className="hero-eyebrow">
              <span className="hero-live-dot" aria-hidden />
              Polkadot Hub TestNet • Chain ID 420420417 • Live
            </div>
            <h1 className="hero-title">DotFuel</h1>
          </div>
        </div>
        <p className="hero-copy">Pay blockchain gas with any token. Zero native balance required.</p>
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">Primary Claim</span>
            <span className={`stat-value ${claimLive ? "stat-value--live" : ""}`}>0 PAS</span>
          </div>
          <div className="stat">
            <span className="stat-label">Guided Steps</span>
            <span className="stat-value">{stepCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Modes</span>
            <span className="stat-value">{modeCount}</span>
          </div>
        </div>
      </section>

      {!isConnected ? (
        <div id="wallet-connect-cta">
          <WalletConnect variant="hero" />
        </div>
      ) : null}

      <section className="section-grid">
        <div className="stack sidebar-stack">
          {isConnected ? <WalletConnect variant="sidebar" /> : null}
          <CounterfactualAddress />
        </div>
        <FlowTabs preferredTab={preferredTab} onHistoryChange={setHistory} />
      </section>
    </main>
  );
}
