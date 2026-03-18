"use client";

import type { FlowResult } from "@/lib/flowResults";
import { CopyableHex } from "@/components/CopyableHex";

export interface TxHistoryItem {
  mode: "token" | "sponsor";
  hash?: string;
  explorerUrl?: string;
  gasCostLabel: FlowResult["gasCostLabel"];
  settlementLabel: FlowResult["settlementLabel"];
  createdAt: number;
}

export function TxHistory({ items }: { items: TxHistoryItem[] }) {
  return (
    <section className="card card--log" id="tx-history">
      <h3 className="card-title">Recent Transactions</h3>
      <p className="card-subtitle">Keep the latest demo steps visible for judges during repeat runs.</p>
      {items.length === 0 ? (
        <div className="history-empty">
          <svg aria-hidden viewBox="0 0 24 24">
            <path d="M5 3.75h10.5L20 8.25V20a1.75 1.75 0 0 1-1.75 1.75H5A1.75 1.75 0 0 1 3.25 20V5.5A1.75 1.75 0 0 1 5 3.75zm9.5 1.9V9h3.35" />
            <path d="M7.25 12h9.5M7.25 15.5h9.5" />
          </svg>
          <strong>No transactions yet</strong>
          <p>Execute a Token or Sponsor flow above to see results here.</p>
        </div>
      ) : null}
      {items.length > 0 ? (
        <ul className="history-list" style={{ marginTop: 16 }}>
          {items.map((item, idx) => (
            <li className="history-item" key={`${item.createdAt}-${idx}`}>
              <strong>{item.mode === "token" ? "Token Mode" : "Sponsor Mode"}</strong>
              <span>{item.gasCostLabel}</span>
              <span>{item.settlementLabel}</span>
              <CopyableHex value={item.hash ?? null} href={item.explorerUrl} fallback="Pending" />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
