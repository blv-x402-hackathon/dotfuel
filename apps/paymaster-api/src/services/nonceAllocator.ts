import { keccak256, toHex } from "viem";
import type { Address } from "viem";

const usedNonces = new Map<Address, Set<bigint>>();

export function allocateNonce(sender: Address): bigint {
  const senderUsed = usedNonces.get(sender) ?? new Set<bigint>();

  let candidate = 0n;
  do {
    const seed = `${sender}-${Date.now()}-${Math.random()}`;
    candidate = BigInt(keccak256(toHex(seed)));
  } while (senderUsed.has(candidate));

  senderUsed.add(candidate);
  usedNonces.set(sender, senderUsed);

  return candidate;
}
