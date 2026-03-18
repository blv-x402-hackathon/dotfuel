"use client";

import { useEffect, useState } from "react";

import { BalancePanel } from "@/components/BalancePanel";
import { SponsorConsole } from "@/components/SponsorConsole";
import { SponsorModeFlow } from "@/components/SponsorModeFlow";
import { TxHistory, type TxHistoryItem } from "@/components/TxHistory";
import { TokenModeFlow } from "@/components/TokenModeFlow";
import { type FlowResult } from "@/lib/flowResults";

const EMPTY_CAMPAIGN_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function FlowTabs(props: {
  preferredTab?: "token" | "sponsor";
  onHistoryChange?: (items: TxHistoryItem[]) => void;
}) {
  const { preferredTab, onHistoryChange } = props;
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
    <div className="stack" id="flow-tabs">
      <BalancePanel refreshKey={balanceRefreshKey} />
      <div className="tab-bar">
        <button
          className={`tab-button ${tab === "token" ? "tab-button--active" : ""}`}
          onClick={() => setTab("token")}
        >
          Token Mode
        </button>
        <button
          className={`tab-button ${tab === "sponsor" ? "tab-button--active" : ""}`}
          onClick={() => setTab("sponsor")}
        >
          Sponsor Mode
        </button>
      </div>

      {tab === "token" ? <TokenModeFlow onTx={onTx} /> : null}
      {tab === "sponsor" ? (
        <>
          <SponsorConsole campaignId={campaignId} onCampaignChange={setCampaignId} refreshKey={campaignRefreshKey} />
          <SponsorModeFlow campaignId={campaignId} onTx={onTx} />
        </>
      ) : null}
      <TxHistory items={history} />
    </div>
  );
}
