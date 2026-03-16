import { keccak256, toHex } from "viem";
import type { Address } from "viem";

import { config } from "../config";

const usedNonces = new Map<Address, Map<bigint, number>>();
const NONCE_TTL_MS = config.QUOTE_TTL_SECONDS * 1_000;

export function allocateNonce(sender: Address): bigint {
  const now = Date.now();
  const senderUsed = usedNonces.get(sender) ?? new Map<bigint, number>();
  pruneExpiredNonces(sender, senderUsed, now);

  let candidate = 0n;
  do {
    const seed = `${sender}-${Date.now()}-${Math.random()}`;
    candidate = BigInt(keccak256(toHex(seed)));
  } while (senderUsed.has(candidate));

  senderUsed.set(candidate, now + NONCE_TTL_MS);
  usedNonces.set(sender, senderUsed);

  return candidate;
}

function pruneExpiredNonces(sender: Address, senderUsed: Map<bigint, number>, now: number) {
  for (const [nonce, expiresAt] of senderUsed) {
    if (expiresAt <= now) {
      senderUsed.delete(nonce);
    }
  }

  if (senderUsed.size === 0) {
    usedNonces.delete(sender);
  }
}
