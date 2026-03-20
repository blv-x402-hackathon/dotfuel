import { encodeFunctionData, parseAbi } from "viem";

import { readEnvString, requireEnvAddress } from "@/lib/envAddress";

const factoryDeployAbi = parseAbi([
  "function createAccount(address owner, uint256 userSalt) returns (address)"
]);

export function buildAccountInitCode(ownerAddress: `0x${string}`, requiresDeployment: boolean): `0x${string}` {
  if (!requiresDeployment) {
    return "0x";
  }

  const factoryAddressRaw = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  if (readEnvString(factoryAddressRaw)) {
    const factoryAddress = requireEnvAddress(factoryAddressRaw, "NEXT_PUBLIC_FACTORY_ADDRESS");
    const createAccountData = encodeFunctionData({
      abi: factoryDeployAbi,
      functionName: "createAccount",
      args: [ownerAddress, 0n]
    });

    return `${factoryAddress}${createAccountData.slice(2)}` as `0x${string}`;
  }

  // Backward compatibility path for legacy environments.
  const fallbackInitCode = readEnvString(process.env.NEXT_PUBLIC_ACCOUNT_INIT_CODE);
  return (fallbackInitCode as `0x${string}` | undefined) ?? "0x";
}
