import { getAddress } from "viem";

function normalizeEnvValue(raw: string | undefined) {
  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim();
  return value.length > 0 ? value : null;
}

export function requireEnvAddress(raw: string | undefined, envName: string): `0x${string}` {
  const value = normalizeEnvValue(raw);
  if (!value) {
    throw new Error(`Set ${envName}`);
  }

  try {
    return getAddress(value as `0x${string}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid address";
    throw new Error(`${envName} is invalid.\n${detail}`);
  }
}

export function readEnvString(raw: string | undefined) {
  return normalizeEnvValue(raw);
}
