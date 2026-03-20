import type { PublicClient } from "viem";
import { parseAbi } from "viem";

import { requireEnvAddress } from "@/lib/envAddress";

const factoryAbi = parseAbi([
  "function getAddress(address owner, uint256 userSalt) view returns (address)"
]);

export async function resolveCounterfactualAddress(
  publicClient: PublicClient,
  ownerAddress: `0x${string}`
): Promise<`0x${string}`> {
  const factoryAddress = requireEnvAddress(process.env.NEXT_PUBLIC_FACTORY_ADDRESS, "NEXT_PUBLIC_FACTORY_ADDRESS");
  const counterfactual = await publicClient.readContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "getAddress",
    args: [ownerAddress, 0n]
  });

  return counterfactual as `0x${string}`;
}
