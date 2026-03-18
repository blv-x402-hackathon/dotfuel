"use client";

import { useEffect, useState } from "react";

export type HealthStatus = "checking" | "ok" | "degraded" | "down";

interface HealthState {
  bundler: HealthStatus;
  paymaster: HealthStatus;
  overall: HealthStatus;
}

const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL ?? "http://localhost:4337";
const PAYMASTER_API_URL = process.env.NEXT_PUBLIC_PAYMASTER_API_URL ?? "http://localhost:3001";

async function pingBundler(): Promise<boolean> {
  try {
    const res = await fetch(BUNDLER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      signal: AbortSignal.timeout(4000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function pingPaymaster(): Promise<boolean> {
  try {
    const res = await fetch(`${PAYMASTER_API_URL}/health`, {
      signal: AbortSignal.timeout(4000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

function deriveOverall(bundler: HealthStatus, paymaster: HealthStatus): HealthStatus {
  if (bundler === "checking" || paymaster === "checking") return "checking";
  if (bundler === "down" && paymaster === "down") return "down";
  if (bundler === "down" || paymaster === "down") return "degraded";
  return "ok";
}

export function useHealthCheck() {
  const [state, setState] = useState<HealthState>({
    bundler: "checking",
    paymaster: "checking",
    overall: "checking"
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const [bundlerOk, paymasterOk] = await Promise.all([pingBundler(), pingPaymaster()]);
      if (cancelled) return;
      const bundler: HealthStatus = bundlerOk ? "ok" : "down";
      const paymaster: HealthStatus = paymasterOk ? "ok" : "down";
      setState({ bundler, paymaster, overall: deriveOverall(bundler, paymaster) });
    }

    check();
    const interval = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return state;
}
