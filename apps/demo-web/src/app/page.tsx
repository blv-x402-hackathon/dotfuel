"use client";

import { useEffect, useMemo, useState } from "react";

import { CounterfactualAddress } from "@/components/CounterfactualAddress";
import { FlowTabs } from "@/components/FlowTabs";
import { StepIndicator, type GuidedStep } from "@/components/StepIndicator";
import type { TxHistoryItem } from "@/components/TxHistory";
import { useWalletModal } from "@/components/WalletContext";
import { useAccount, usePublicClient } from "wagmi";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { openModal } = useWalletModal();
  const [history, setHistory] = useState<TxHistoryItem[]>([]);
  const [preferredTab, setPreferredTab] = useState<"token" | "sponsor">("token");
  const [eoaBalance, setEoaBalance] = useState<bigint | null>(null);

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
        description: isConnected ? "Wallet connected." : "Connect your wallet to get started.",
        status: doneFlags[0] ? "done" : activeIndex === 0 ? "active" : "locked"
      },
      {
        title: "Check Balance",
        description: !isConnected
          ? "Available after wallet connection."
          : eoaBalance === null
            ? "Checking current native balance..."
            : eoaBalance === 0n
              ? "0 PAS confirmed — ready for gasless transactions."
              : "Native PAS detected. You can still continue.",
        status: doneFlags[1] ? "done" : activeIndex === 1 ? "active" : "locked"
      },
      {
        title: "Send Transaction",
        description: hasTokenRun ? "Transaction executed successfully." : "Submit a gasless transaction paid in token.",
        status: doneFlags[2] ? "done" : activeIndex === 2 ? "active" : "locked"
      },
      {
        title: "Verify On-chain",
        description: hasSettlement ? "Transaction confirmed on-chain." : "Open the transaction and verify settlement.",
        status: doneFlags[3] ? "done" : activeIndex === 3 || activeIndex === -1 ? "active" : "locked"
      }
    ];
  }, [eoaBalance, history, isConnected]);

  function handleQuickDemo() {
    if (!isConnected) {
      openModal();
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
      <section className="hero">
        <h1 className="hero-title">DotFuel</h1>
        <p className="hero-copy">Pay blockchain gas with any token. Zero native balance required.</p>
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">Gas Required</span>
            <span className="stat-value stat-value--live">0 PAS</span>
          </div>
          <div className="stat">
            <span className="stat-label">Payment Modes</span>
            <span className="stat-value">2</span>
            <span className="stat-sublabel">Token + Sponsor</span>
          </div>
          <div className="stat">
            <span className="stat-label">Settlement</span>
            <span className="stat-value stat-value--text">Permit2</span>
          </div>
        </div>
        <div className="hero-cta-row">
          {!isConnected ? (
            <button className="button button--accent" onClick={openModal} type="button">
              Connect Wallet
            </button>
          ) : (
            <button
              className="button button--accent"
              onClick={() => {
                setPreferredTab("token");
                document.getElementById("flow-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              type="button"
            >
              Start Token Mode
            </button>
          )}
        </div>
      </section>

      <StepIndicator steps={steps} onQuickDemo={handleQuickDemo} />

      <section className="section-grid">
        <div className="stack sidebar-stack">
          <CounterfactualAddress />
        </div>
        <FlowTabs preferredTab={preferredTab} onHistoryChange={setHistory} />
      </section>
    </main>
  );
}
