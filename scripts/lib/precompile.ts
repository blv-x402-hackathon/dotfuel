import type { Address } from "viem";

const POLKADOT_HUB_ERC20_PREFIX = "01200000";

export function assetIdToPrecompileAddress(assetId: number): Address {
  if (!Number.isInteger(assetId) || assetId < 0) {
    throw new Error(`assetId must be a non-negative integer: received ${assetId}`);
  }

  const assetHex = assetId.toString(16).padStart(8, "0").toUpperCase();
  return `0x${assetHex}${"0".repeat(24)}${POLKADOT_HUB_ERC20_PREFIX}` as Address;
}
