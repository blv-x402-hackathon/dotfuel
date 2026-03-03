"use client";

export interface TxHistoryItem {
  mode: "token" | "sponsor";
  hash?: string;
  explorerUrl?: string;
  createdAt: number;
}

export function TxHistory({ items }: { items: TxHistoryItem[] }) {
  return (
    <section style={{ padding: 16, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <h3 style={{ marginTop: 0 }}>Recent Transactions</h3>
      {items.length === 0 ? <p style={{ margin: 0 }}>No transactions yet.</p> : null}
      <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6 }}>
        {items.map((item, idx) => (
          <li key={`${item.createdAt}-${idx}`}>
            <strong>{item.mode === "token" ? "Token Mode" : "Sponsor Mode"}</strong>
            {item.explorerUrl ? (
              <>
                {" "}
                <a href={item.explorerUrl} target="_blank" rel="noreferrer">
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
