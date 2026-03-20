"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

import { readEnvString } from "@/lib/envAddress";
import { resolveCounterfactualAddress } from "@/lib/counterfactual";

interface CounterfactualState {
  address: `0x${string}` | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
}

export function useCounterfactualAddress() {
  const { address: ownerAddress } = useAccount();
  const publicClient = usePublicClient();
  const [state, setState] = useState<CounterfactualState>({
    address: null,
    status: "idle",
    error: null
  });

  useEffect(() => {
    async function run() {
      if (!ownerAddress || !publicClient) {
        setState({
          address: null,
          status: "idle",
          error: null
        });
        return;
      }

      const factoryAddressRaw = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
      if (!readEnvString(factoryAddressRaw)) {
        setState({
          address: null,
          status: "error",
          error: "Set NEXT_PUBLIC_FACTORY_ADDRESS"
        });
        return;
      }

      setState((current) => ({
        ...current,
        status: "loading",
        error: null
      }));

      try {
        const counterfactual = await resolveCounterfactualAddress(publicClient, ownerAddress);

        setState({
          address: counterfactual,
          status: "ready",
          error: null
        });
      } catch (error) {
        setState({
          address: null,
          status: "error",
          error: error instanceof Error ? error.message : "failed"
        });
      }
    }

    run();
  }, [ownerAddress, publicClient]);

  return state;
}
