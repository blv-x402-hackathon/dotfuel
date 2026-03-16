import { formatUnits } from "viem";

export interface FlowTimelineStep {
  title: string;
  detail: string;
  status: "done" | "pending";
}

export interface FlowResult {
  mode: "token" | "sponsor";
  hash?: string;
  txHash?: string;
  userOpHash: string;
  explorerUrl?: string;
  gasCostLabel: string;
  settlementLabel: string;
  timeline: FlowTimelineStep[];
}

export function formatAmount(value: bigint, decimals: number, maxFractionDigits: number) {
  const rendered = formatUnits(value, decimals);
  const [whole, fraction = ""] = rendered.split(".");

  if (fraction.length === 0) {
    return whole;
  }

  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}
