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

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function TxHistory({ items }: { items: TxHistoryItem[] }) {
  return (
    <section className="card card--log" id="tx-history">
      <h3 className="card-title">Recent Transactions</h3>
      <p className="card-subtitle">Your recent gasless transactions from this session.</p>
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
            <li className="history-item history-item--bordered" key={`${item.createdAt}-${idx}`}>
              <div className="history-item__head">
                <span className={`badge ${item.mode === "token" ? "badge--accent" : "badge--neutral"}`}>
                  {item.mode === "token" ? "Token Mode" : "Sponsor Mode"}
                </span>
                <span className="history-item__time">{formatTime(item.createdAt)}</span>
              </div>
              <span className="history-item__detail">{item.gasCostLabel}</span>
              <span className="history-item__detail">{item.settlementLabel}</span>
              <div className="history-item__foot">
                <CopyableHex value={item.hash ?? null} fallback="Pending" />
                {item.explorerUrl ? (
                  <a className="inline-link explorer-link" href={item.explorerUrl} target="_blank" rel="noreferrer">
                    View on Blockscout
                    <svg className="external-icon" aria-hidden viewBox="0 0 16 16" fill="none">
                      <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5m0 0v5m0-5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
