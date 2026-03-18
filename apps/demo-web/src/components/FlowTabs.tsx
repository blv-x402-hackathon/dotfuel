"use client";

import { useEffect, useRef, useState } from "react";

import { BalancePanel } from "@/components/BalancePanel";
import { SponsorConsole } from "@/components/SponsorConsole";
import { SponsorModeFlow } from "@/components/SponsorModeFlow";
import { Toast, type ToastMessage } from "@/components/Toast";
import { TxHistory, type TxHistoryItem } from "@/components/TxHistory";
import { TokenModeFlow } from "@/components/TokenModeFlow";
import { type FlowResult } from "@/lib/flowResults";
import { useAccount } from "wagmi";

const EMPTY_CAMPAIGN_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";
const DEFAULT_TITLE = "DotFuel Demo";
interface FlowToast extends ToastMessage {
  targetId: string;
}

export function FlowTabs(props: {
  preferredTab?: "token" | "sponsor";
  onHistoryChange?: (items: TxHistoryItem[]) => void;
}) {
  const { preferredTab, onHistoryChange } = props;
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<"token" | "sponsor">("token");
  const [history, setHistory] = useState<TxHistoryItem[]>([]);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [campaignId, setCampaignId] = useState<`0x${string}`>(
    (process.env.NEXT_PUBLIC_CAMPAIGN_ID as `0x${string}` | undefined) ?? EMPTY_CAMPAIGN_ID
  );
  const [campaignRefreshKey, setCampaignRefreshKey] = useState(0);
  const [toast, setToast] = useState<FlowToast | null>(null);
  const hasActiveCampaign = campaignId !== EMPTY_CAMPAIGN_ID;
  const [isProcessing, setIsProcessing] = useState(false);
  const successTitleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!preferredTab) return;
    setTab(preferredTab);
  }, [preferredTab]);

  useEffect(() => {
    onHistoryChange?.(history);
  }, [history, onHistoryChange]);

  const onTx = (result: FlowResult) => {
    setIsProcessing(false);
    setBalanceRefreshKey((current) => current + 1);
    if (result.mode === "sponsor") {
      setCampaignRefreshKey((current) => current + 1);
    }
    setHistory((prev) => [
      {
        mode: result.mode,
        hash: result.hash,
        explorerUrl: result.explorerUrl,
        gasCostLabel: result.gasCostLabel,
        settlementLabel: result.settlementLabel,
        createdAt: Date.now()
      },
      ...prev
    ].slice(0, 10));

    setToast({
      id: Date.now(),
      kind: "success",
      title: "TX confirmed!",
      description: `Gas: ${result.gasCostLabel} -> ${result.settlementLabel}`,
      targetId: result.mode === "token" ? "token-flow-result" : "sponsor-flow-result"
    });

    if (typeof document !== "undefined") {
      document.title = "✅ TX Confirmed | DotFuel";
      if (successTitleTimerRef.current) {
        window.clearTimeout(successTitleTimerRef.current);
      }
      successTitleTimerRef.current = window.setTimeout(() => {
        document.title = DEFAULT_TITLE;
      }, 3000);
    }
  };

  const onFlowError = (mode: "token" | "sponsor", message: string) => {
    setIsProcessing(false);
    setToast({
      id: Date.now(),
      kind: "error",
      title: "TX failed",
      description: message,
      targetId: mode === "token" ? "token-flow" : "sponsor-flow"
    });

    if (typeof document !== "undefined") {
      document.title = "❌ TX Failed | DotFuel";
    }
  };

  const onFlowLoadingChange = (nextLoading: boolean) => {
    setIsProcessing(nextLoading);
    if (typeof document === "undefined") return;
    if (nextLoading) {
      if (successTitleTimerRef.current) {
        window.clearTimeout(successTitleTimerRef.current);
      }
      document.title = "⏳ Processing... | DotFuel";
      return;
    }

    if (document.title === "⏳ Processing... | DotFuel") {
      document.title = DEFAULT_TITLE;
    }
  };

  useEffect(() => {
    return () => {
      if (successTitleTimerRef.current) {
        window.clearTimeout(successTitleTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`stack flow-tabs-shell ${isConnected ? "" : "flow-tabs-shell--locked"}`} id="flow-tabs">
      {!isConnected ? <div className="flow-tabs-shell__overlay">Connect wallet first to unlock execution flows.</div> : null}
      <BalancePanel refreshKey={balanceRefreshKey} />
      <div className="tab-bar">
        <button
          className={`tab-button ${tab === "token" ? "tab-button--active" : ""}`}
          disabled={!isConnected}
          onClick={() => setTab("token")}
          title={!isConnected ? "Wallet required" : undefined}
        >
          Token Mode
        </button>
        <button
          className={`tab-button ${tab === "sponsor" ? "tab-button--active" : ""}`}
          disabled={!isConnected}
          onClick={() => setTab("sponsor")}
          title={!isConnected ? "Wallet required" : undefined}
        >
          Sponsor Mode
        </button>
      </div>

      <div className={`tab-panel ${tab === "token" ? "tab-panel--active" : "tab-panel--inactive"}`}>
        <TokenModeFlow
          onTx={onTx}
          onFlowError={(message) => onFlowError("token", message)}
          onLoadingChange={onFlowLoadingChange}
          walletRequired={!isConnected}
        />
      </div>
      <div className={`tab-panel ${tab === "sponsor" ? "tab-panel--active" : "tab-panel--inactive"}`}>
        <div className="stack">
          {hasActiveCampaign ? (
            <SponsorModeFlow
              campaignId={campaignId}
              onTx={onTx}
              onFlowError={(message) => onFlowError("sponsor", message)}
              onLoadingChange={onFlowLoadingChange}
              walletRequired={!isConnected}
            />
          ) : (
            <p className="card-subtitle">No active campaign yet. Create one below to enable sponsored execution.</p>
          )}
          <SponsorConsole campaignId={campaignId} onCampaignChange={setCampaignId} refreshKey={campaignRefreshKey} />
        </div>
      </div>
      <TxHistory items={history} />
      <Toast
        toast={toast}
        onDismiss={() => {
          setToast(null);
          if (typeof document !== "undefined" && document.title === "❌ TX Failed | DotFuel" && !isProcessing) {
            document.title = DEFAULT_TITLE;
          }
        }}
        onOpen={() => {
          if (!toast) return;
          document.getElementById(toast.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
    </div>
  );
}
