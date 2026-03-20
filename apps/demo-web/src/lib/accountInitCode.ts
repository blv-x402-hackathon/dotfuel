import { encodeFunctionData, getAddress, parseAbi } from "viem";

const factoryDeployAbi = parseAbi([
  "function createAccount(address owner, uint256 userSalt) returns (address)"
]);

export function buildAccountInitCode(ownerAddress: `0x${string}`, requiresDeployment: boolean): `0x${string}` {
  if (!requiresDeployment) {
    return "0x";
  }

  const factoryAddressRaw = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  if (factoryAddressRaw) {
    const factoryAddress = getAddress(factoryAddressRaw as `0x${string}`);
    const createAccountData = encodeFunctionData({
      abi: factoryDeployAbi,
      functionName: "createAccount",
      args: [ownerAddress, 0n]
    });

    return `${factoryAddress}${createAccountData.slice(2)}` as `0x${string}`;
  }

  // Backward compatibility path for legacy environments.
  return (process.env.NEXT_PUBLIC_ACCOUNT_INIT_CODE as `0x${string}` | undefined) ?? "0x";
}
