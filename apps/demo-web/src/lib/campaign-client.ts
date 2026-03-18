import { toHex } from "viem";

const baseUrl = process.env.NEXT_PUBLIC_PAYMASTER_API_URL ?? "http://localhost:3001";

// ── Recent campaigns (localStorage) ──────────────────────────────────────────

export interface RecentCampaign {
  id: string;
  name: string;
  createdAt: number;
}

const RECENT_KEY = "dotfuel:recentCampaigns";
const MAX_RECENT = 10;

export function getRecentCampaigns(): RecentCampaign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentCampaign[];
  } catch {
    return [];
  }
}

export function addRecentCampaign(id: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentCampaigns().filter((c) => c.id !== id);
    const updated = [{ id, name, createdAt: Date.now() }, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

interface CreateCampaignPayload {
  campaignId: `0x${string}`;
  start: number;
  end: number;
  budget: bigint;
  allowedTargets: `0x${string}`[];
  perUserMaxOps: number;
}

export interface CampaignStatus {
  enabled: boolean;
  budget: `0x${string}`;
  spent: `0x${string}`;
  remainingBudget: `0x${string}`;
  perUserMaxOps: number;
  userOpsUsed?: number;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "request failed");
  }

  return res.json() as Promise<T>;
}

export async function createCampaign(payload: CreateCampaignPayload) {
  const res = await fetch(`${baseUrl}/v1/campaign/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      campaignId: payload.campaignId,
      start: payload.start,
      end: payload.end,
      budget: toHex(payload.budget),
      allowedTargets: payload.allowedTargets,
      perUserMaxOps: payload.perUserMaxOps
    })
  });

  return parseJsonResponse<{ txHash: `0x${string}` }>(res);
}

export async function fetchCampaignStatus(campaignId: `0x${string}`, user?: `0x${string}`) {
  const url = new URL(`${baseUrl}/v1/campaign/${campaignId}/status`);
  if (user) {
    url.searchParams.set("user", user);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store"
  });

  return parseJsonResponse<CampaignStatus>(res);
}
