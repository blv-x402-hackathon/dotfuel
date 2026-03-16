"use client";

import { useMemo, useState } from "react";

import { LoadingOverlay } from "@/components/LoadingOverlay";
import { SponsorModeFlow } from "@/components/SponsorModeFlow";
import { type FlowResult, TokenModeFlow } from "@/components/TokenModeFlow";
import { TxHistory, type TxHistoryItem } from "@/components/TxHistory";

export function FlowTabs() {
  const [tab, setTab] = useState<"token" | "sponsor">("token");
  const [history, setHistory] = useState<TxHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const onTx = (result: FlowResult) => {
    setLoading(false);
    setHistory((prev) => [
      {
        mode: result.mode,
        hash: result.hash,
        explorerUrl: result.explorerUrl,
        createdAt: Date.now()
      },
      ...prev
    ].slice(0, 5));
  };

  const content = useMemo(() => {
    if (tab === "token") {
      return <TokenModeFlow onTx={onTx} />;
    }
    return <SponsorModeFlow onTx={onTx} />;
  }, [tab]);

  return (
    <div className="stack">
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

      {content}
      <TxHistory items={history} />
      <LoadingOverlay show={loading} />
    </div>
  );
}
