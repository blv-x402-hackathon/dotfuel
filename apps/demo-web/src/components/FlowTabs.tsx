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
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setTab("token")}
          style={{ background: tab === "token" ? "#0f172a" : "#e2e8f0", color: tab === "token" ? "#fff" : "#111" }}
        >
          Token Mode
        </button>
        <button
          onClick={() => setTab("sponsor")}
          style={{
            background: tab === "sponsor" ? "#0f172a" : "#e2e8f0",
            color: tab === "sponsor" ? "#fff" : "#111"
          }}
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
