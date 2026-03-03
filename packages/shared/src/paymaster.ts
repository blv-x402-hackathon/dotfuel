import {
  concatHex,
  decodeAbiParameters,
  encodeAbiParameters,
  getAddress,
  padHex,
  sliceHex
} from "viem";
import type { Address, Hex } from "viem";

import type { PaymasterData } from "./types";

const paymasterDataAbi = [
  {
    type: "tuple",
    components: [
      { name: "mode", type: "uint8" },
      { name: "validUntil", type: "uint48" },
      { name: "signature", type: "bytes" },
      { name: "campaignId", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "maxTokenCharge", type: "uint256" },
      { name: "tokenPerNativeScaled", type: "uint256" },
      { name: "permit2Nonce", type: "uint256" },
      { name: "permit2Deadline", type: "uint256" },
      { name: "permit2Signature", type: "bytes" }
    ]
  }
] as const;

export function encodePaymasterAndData(paymasterAddress: Address, data: PaymasterData): Hex {
  const tuple = {
    mode: data.mode,
    validUntil: Number(data.validUntil),
    signature: data.signature,
    campaignId: data.campaignId ?? padHex("0x0", { size: 32 }),
    token: data.token ?? getAddress("0x0000000000000000000000000000000000000000"),
    maxTokenCharge: data.maxTokenCharge ?? 0n,
    tokenPerNativeScaled: data.tokenPerNativeScaled ?? 0n,
    permit2Nonce: data.permit2Nonce ?? 0n,
    permit2Deadline: data.permit2Deadline ?? 0n,
    permit2Signature: data.permit2Signature ?? "0x"
  };

  const encodedData = encodeAbiParameters(paymasterDataAbi, [tuple]);
  return concatHex([paymasterAddress, encodedData]);
}

export function decodePaymasterAndData(raw: Hex): { paymasterAddress: Address; data: PaymasterData } {
  const paymasterAddress = getAddress(sliceHex(raw, 0, 20));
  const encodedData = sliceHex(raw, 20);

  const [decoded] = decodeAbiParameters(paymasterDataAbi, encodedData);

  const data: PaymasterData = {
    mode: Number(decoded.mode) as 1 | 2,
    validUntil: BigInt(decoded.validUntil),
    signature: decoded.signature
  };

  if (data.mode === 1) {
    data.campaignId = decoded.campaignId;
  }

  if (data.mode === 2) {
    data.token = decoded.token;
    data.maxTokenCharge = decoded.maxTokenCharge;
    data.tokenPerNativeScaled = decoded.tokenPerNativeScaled;
    data.permit2Nonce = decoded.permit2Nonce;
    data.permit2Deadline = decoded.permit2Deadline;
    data.permit2Signature = decoded.permit2Signature;
  }

  return { paymasterAddress, data };
}
