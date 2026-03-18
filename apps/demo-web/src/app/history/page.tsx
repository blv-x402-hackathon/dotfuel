"use client";

import { useEffect, useState } from "react";

import { CopyableHex } from "@/components/CopyableHex";

interface StoredTxItem {
  mode: "token" | "sponsor";
  hash?: string;
  explorerUrl?: string;
  gasCostLabel: string;
  settlementLabel: string;
  createdAt: number;
}

const STORAGE_KEY = "dotfuel-tx-history";

function loadHistory(): StoredTxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

type FilterMode = "all" | "token" | "sponsor";

export default function HistoryPage() {
  const [items, setItems] = useState<StoredTxItem[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setItems(loadHistory());
  }, []);

  const filtered = items.filter((item) => {
    if (filter !== "all" && item.mode !== filter) return false;
    if (search && item.hash && !item.hash.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <main className="page-shell">
      <section className="hero" style={{ padding: 24 }}>
        <h1 className="hero-title" style={{ fontSize: "var(--text-2xl)", marginBottom: 8 }}>Transaction History</h1>
        <p className="hero-copy">Browse your gasless transaction history.</p>
      </section>

      <div className="stack" style={{ marginTop: 18 }}>
        <div className="card card--data">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div className="tab-bar">
              {(["all", "token", "sponsor"] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`tab-button ${filter === mode ? "tab-button--active" : ""}`}
                  onClick={() => setFilter(mode)}
                  type="button"
                >
                  {mode === "all" ? "All" : mode === "token" ? "Token" : "Sponsor"}
                </button>
              ))}
            </div>
            <input
              className="input"
              placeholder="Search by tx hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
          </div>
        </div>

        <div className="card card--log">
          {filtered.length === 0 ? (
            <div className="history-empty">
              <svg aria-hidden viewBox="0 0 24 24">
                <path d="M5 3.75h10.5L20 8.25V20a1.75 1.75 0 0 1-1.75 1.75H5A1.75 1.75 0 0 1 3.25 20V5.5A1.75 1.75 0 0 1 5 3.75zm9.5 1.9V9h3.35" />
                <path d="M7.25 12h9.5M7.25 15.5h9.5" />
              </svg>
              <strong>No transactions found</strong>
              <p>{search ? "Try a different search term." : "Your transaction history will appear here after sending gasless transactions."}</p>
            </div>
          ) : (
            <ul className="history-list">
              {filtered.map((item, idx) => (
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
                          <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5m0 0v5m0-5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
