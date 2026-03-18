"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { CopyableHex } from "@/components/CopyableHex";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { exportTxHistoryCsv } from "@/lib/exportCsv";
import { loadTxHistory, type StoredTxItem } from "@/lib/txHistory";

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

function TxItemRow({ item }: { item: StoredTxItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="history-item history-item--bordered">
      <button
        className="history-item__summary"
        onClick={() => setExpanded((v) => !v)}
        type="button"
        aria-expanded={expanded}
      >
        <div className="history-item__head">
          <span className={`badge ${item.mode === "token" ? "badge--accent" : "badge--neutral"}`}>
            {item.mode === "token" ? "Token Mode" : "Sponsor Mode"}
          </span>
          <span className="history-item__time">{formatTime(item.createdAt)}</span>
        </div>
        <div className="history-item__preview">
          <span className="history-item__detail">{item.gasCostLabel}</span>
          <span className="history-item__sep">→</span>
          <span className="history-item__detail">{item.settlementLabel}</span>
        </div>
        <span className="history-item__chevron" aria-hidden>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            width="14"
            height="14"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div className="history-item__detail-panel">
          <div className="history-detail-grid">
            <div className="history-detail-row">
              <span className="label">Gas Cost</span>
              <strong>{item.gasCostLabel}</strong>
            </div>
            <div className="history-detail-row">
              <span className="label">Settlement</span>
              <strong>{item.settlementLabel}</strong>
            </div>
            <div className="history-detail-row">
              <span className="label">Mode</span>
              <strong>{item.mode === "token" ? "Token (Permit2)" : "Sponsored"}</strong>
            </div>
            <div className="history-detail-row">
              <span className="label">Time</span>
              <strong>{formatTime(item.createdAt)}</strong>
            </div>
          </div>
          <div className="history-detail-hash">
            <span className="label">Transaction Hash</span>
            <CopyableHex value={item.hash ?? null} fallback="Pending" />
          </div>
          {item.explorerUrl ? (
            <a className="inline-link explorer-link" href={item.explorerUrl} target="_blank" rel="noreferrer">
              View on Blockscout
              <svg className="external-icon" aria-hidden viewBox="0 0 16 16" fill="none">
                <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5m0 0v5m0-5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [items, setItems] = useState<StoredTxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setItems(loadTxHistory());
    setLoading(false);
  }, []);

  // Reset pagination when filter/search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, search]);

  const tokenCount = items.filter((i) => i.mode === "token").length;
  const sponsorCount = items.filter((i) => i.mode === "sponsor").length;

  const filtered = items.filter((item) => {
    if (filter !== "all" && item.mode !== filter) return false;
    if (search && item.hash && !item.hash.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const isEmpty = filtered.length === 0;
  const hasNoHistory = items.length === 0;

  return (
    <main className="page-shell">
      <h1 className="page-section-title">Transaction History</h1>
      <p className="card-subtitle mt-1-5">Browse your gasless transaction history.</p>

      <div className="stack mt-6">
        <div className="card card--data">
          <div className="history-filter-row">
            <div className="tab-bar">
              {(["all", "token", "sponsor"] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`tab-button ${filter === mode ? "tab-button--active" : ""}`}
                  onClick={() => setFilter(mode)}
                  type="button"
                >
                  {mode === "all" ? `All (${items.length})` : mode === "token" ? `Token (${tokenCount})` : `Sponsor (${sponsorCount})`}
                </button>
              ))}
            </div>
            <input
              className="input"
              placeholder="Search by tx hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search transactions by hash"
            />
            {items.length > 0 ? (
              <button
                className="button button--sm button--ghost"
                onClick={() => exportTxHistoryCsv(items)}
                type="button"
              >
                Export CSV
              </button>
            ) : null}
          </div>
        </div>

        <div className="card card--log">
          {loading ? (
            <ul className="history-list" aria-label="Loading transactions">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="history-item history-item--bordered">
                  <div className="history-item__head">
                    <Skeleton height={22} width={80} variant="rect" />
                    <Skeleton height={12} width={120} />
                  </div>
                  <div className="history-item__preview">
                    <Skeleton height={14} width={160} />
                  </div>
                </li>
              ))}
            </ul>
          ) : isEmpty ? (
            <div className="history-empty">
              {hasNoHistory ? (
                <EmptyState
                  illustration="empty-tx"
                  title="No transactions yet"
                  description="Send your first gasless transaction to see it here."
                >
                  <Link href="/send" className="button button--accent">
                    Send a Gasless Transaction
                  </Link>
                </EmptyState>
              ) : (
                <EmptyState
                  illustration="no-results"
                  title="No results found"
                  description={
                    search
                      ? "No transactions match that hash. Try a different search term."
                      : `No ${filter === "token" ? "token" : "sponsor"} transactions yet.`
                  }
                >
                  {search ? (
                    <button className="button button--ghost" onClick={() => setSearch("")} type="button">
                      Clear Search
                    </button>
                  ) : (
                    <button className="button button--ghost" onClick={() => setFilter("all")} type="button">
                      View All
                    </button>
                  )}
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <ul className="history-list">
                {visible.map((item, idx) => (
                  <TxItemRow key={`${item.createdAt}-${idx}`} item={item} />
                ))}
              </ul>
              {hasMore ? (
                <div className="history-load-more">
                  <button
                    className="button button--ghost button--sm"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    type="button"
                  >
                    Load More ({filtered.length - visibleCount} remaining)
                  </button>
                </div>
              ) : items.length >= 100 ? (
                <p className="history-limit-notice">Oldest transactions are automatically removed after 100 entries.</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
