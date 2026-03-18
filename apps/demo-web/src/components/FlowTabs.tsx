"use client";

import { useEffect, useState } from "react";

import { BalancePanel } from "@/components/BalancePanel";
import { SponsorConsole } from "@/components/SponsorConsole";
import { SponsorModeFlow } from "@/components/SponsorModeFlow";
import { TxHistory, type TxHistoryItem } from "@/components/TxHistory";
import { TokenModeFlow } from "@/components/TokenModeFlow";
import { type FlowResult } from "@/lib/flowResults";
import { useAccount } from "wagmi";

const EMPTY_CAMPAIGN_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";

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

  useEffect(() => {
    if (!preferredTab) return;
    setTab(preferredTab);
  }, [preferredTab]);

  useEffect(() => {
    onHistoryChange?.(history);
  }, [history, onHistoryChange]);

  const onTx = (result: FlowResult) => {
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
    ].slice(0, 5));
  };

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

      {tab === "token" ? <TokenModeFlow onTx={onTx} walletRequired={!isConnected} /> : null}
      {tab === "sponsor" ? (
        <>
          <SponsorConsole campaignId={campaignId} onCampaignChange={setCampaignId} refreshKey={campaignRefreshKey} />
          <SponsorModeFlow campaignId={campaignId} onTx={onTx} walletRequired={!isConnected} />
        </>
      ) : null}
      <TxHistory items={history} />
    </div>
  );
}
