const STORAGE_KEY = "dotfuel-tx-history";

export interface StoredTxItem {
  mode: "token" | "sponsor";
  hash?: string;
  explorerUrl?: string;
  gasCostLabel: string;
  settlementLabel: string;
  createdAt: number;
}

export function loadTxHistory(): StoredTxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendTxHistory(item: StoredTxItem): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadTxHistory();
    const updated = [item, ...existing].slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}
