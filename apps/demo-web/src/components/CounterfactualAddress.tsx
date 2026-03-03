"use client";

import { useEffect, useState } from "react";
import { getAddress, parseAbi } from "viem";
import { useAccount, usePublicClient } from "wagmi";

const factoryAbi = parseAbi([
  "function getAddress(address owner, uint256 userSalt) view returns (address)"
]);

export function CounterfactualAddress() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [counterfactual, setCounterfactual] = useState<string>("-");

  useEffect(() => {
    async function run() {
      if (!address || !publicClient) {
        setCounterfactual("-");
        return;
      }

      const factoryAddressRaw = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
      if (!factoryAddressRaw) {
        setCounterfactual("Set NEXT_PUBLIC_FACTORY_ADDRESS");
        return;
      }

      try {
        const factoryAddress = getAddress(factoryAddressRaw as `0x${string}`);
        const computed = await publicClient.readContract({
          address: factoryAddress,
          abi: factoryAbi,
          functionName: "getAddress",
          args: [address, 0n]
        });
        setCounterfactual(computed);
      } catch (error) {
        setCounterfactual(error instanceof Error ? error.message : "failed");
      }
    }

    run();
  }, [address, publicClient]);

  return (
    <div>
      <strong>Counterfactual:</strong> {counterfactual}
    </div>
  );
}
