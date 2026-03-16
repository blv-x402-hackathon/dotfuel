"use client";

import { useEffect, useState } from "react";
import { getAddress, parseAbi } from "viem";
import { useAccount, usePublicClient } from "wagmi";

const factoryAbi = parseAbi([
  "function getAddress(address owner, uint256 userSalt) view returns (address)"
]);

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

      const explicitCounterfactual = process.env.NEXT_PUBLIC_COUNTERFACTUAL_ADDRESS;
      if (explicitCounterfactual) {
        setState({
          address: getAddress(explicitCounterfactual as `0x${string}`),
          status: "ready",
          error: null
        });
        return;
      }

      const factoryAddressRaw = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
      if (!factoryAddressRaw) {
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
        const factoryAddress = getAddress(factoryAddressRaw as `0x${string}`);
        const counterfactual = await publicClient.readContract({
          address: factoryAddress,
          abi: factoryAbi,
          functionName: "getAddress",
          args: [ownerAddress, 0n]
        });

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
