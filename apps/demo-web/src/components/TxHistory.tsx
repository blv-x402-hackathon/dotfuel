"use client";

import type { FlowResult } from "@/lib/flowResults";

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
    <section className="card">
      <h3 className="card-title">Recent Transactions</h3>
      <p className="card-subtitle">Keep the latest demo steps visible for judges during repeat runs.</p>
      {items.length === 0 ? <p className="card-subtitle" style={{ marginTop: 16 }}>No transactions yet.</p> : null}
      <ul className="history-list" style={{ marginTop: 16 }}>
        {items.map((item, idx) => (
          <li className="history-item" key={`${item.createdAt}-${idx}`}>
            <strong>{item.mode === "token" ? "Token Mode" : "Sponsor Mode"}</strong>
            <span>{item.gasCostLabel}</span>
            <span>{item.settlementLabel}</span>
            {item.explorerUrl ? (
              <>
                {" "}
                <a className="inline-link" href={item.explorerUrl} target="_blank" rel="noreferrer">
                  {item.hash ?? "View Tx"}
                </a>
              </>
            ) : (
              <> {item.hash ?? "Pending"}</>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
