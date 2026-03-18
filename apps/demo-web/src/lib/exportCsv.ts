import type { StoredTxItem } from "@/lib/txHistory";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportTxHistoryCsv(items: StoredTxItem[]): void {
  const headers = ["timestamp", "mode", "tx_hash", "gas_cost", "settlement", "explorer_url"];
  const rows = items.map((item) => [
    new Date(item.createdAt).toISOString(),
    item.mode,
    item.hash ?? "",
    item.gasCostLabel,
    item.settlementLabel,
    item.explorerUrl ?? ""
  ].map(escapeCsv).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dotfuel-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
