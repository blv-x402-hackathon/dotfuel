import { concatHex, encodeAbiParameters, getAddress, keccak256, parseAbi, toHex } from "viem";
import type { Hex } from "viem";

import { quoteSignerClient, publicClient } from "../client";
import { config } from "../config";

const campaignRegistryAbi = parseAbi([
  "function getCampaign(bytes32 campaignId) view returns ((bool enabled,uint48 start,uint48 end,uint256 budget,uint256 spent,address[] allowedTargets,uint32 perUserMaxOps))"
]);

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

const SPONSOR_QUOTE_TYPE = {
  SponsorQuote: [
    { name: "sender", type: "address" },
    { name: "callDataHash", type: "bytes32" },
    { name: "campaignId", type: "bytes32" },
    { name: "validUntil", type: "uint48" }
  ]
} as const;

export interface SponsorQuoteRequest {
  chainId: number;
  sender: string;
  callData: string;
  initCode: string;
  campaignId: string;
}

export async function buildSponsorQuote(req: SponsorQuoteRequest) {
  const sender = getAddress(req.sender);
  const callData = req.callData as Hex;
  const campaignId = req.campaignId as Hex;
  const paymasterAddress = getAddress(config.PAYMASTER_ADDRESS);

  const campaign = await publicClient.readContract({
    address: getAddress(config.CAMPAIGN_REGISTRY_ADDRESS),
    abi: campaignRegistryAbi,
    functionName: "getCampaign",
    args: [campaignId]
  });

  const { enabled, start, end, budget, spent } = campaign;
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (!enabled) {
    throw new Error("campaign disabled");
  }
  if (now < BigInt(start) || now > BigInt(end)) {
    throw new Error("campaign inactive");
  }
  if (BigInt(spent) >= BigInt(budget)) {
    throw new Error("campaign budget exhausted");
  }

  const validUntil = minBigInt(now + BigInt(config.QUOTE_TTL_SECONDS), BigInt(end));
  const callDataHash = keccak256(callData);

  const paymasterSignature = await quoteSignerClient.signTypedData({
    account: quoteSignerClient.account,
    domain: {
      name: "GasStationPaymaster",
      version: "1",
      chainId: req.chainId,
      verifyingContract: paymasterAddress
    },
    types: SPONSOR_QUOTE_TYPE,
    primaryType: "SponsorQuote",
    message: {
      sender,
      callDataHash,
      campaignId,
      validUntil: Number(validUntil)
    }
  });

  const paymasterAndData = encodePaymasterAndData(paymasterAddress, {
    mode: 1,
    validUntil,
    signature: paymasterSignature,
    campaignId
  });

  return {
    mode: "sponsor",
    chainId: req.chainId,
    sender,
    campaignId,
    callDataHash,
    validUntil: toHex(validUntil),
    paymasterSignature,
    paymasterAndData
  };
}

function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function encodePaymasterAndData(paymasterAddress: `0x${string}`, data: {
  mode: 1 | 2;
  validUntil: bigint;
  signature: Hex;
  campaignId?: Hex;
  token?: `0x${string}`;
  maxTokenCharge?: bigint;
  tokenPerNativeScaled?: bigint;
  permit2Nonce?: bigint;
  permit2Deadline?: bigint;
  permit2Signature?: Hex;
}): Hex {
  const tuple = {
    mode: data.mode,
    validUntil: Number(data.validUntil),
    signature: data.signature,
    campaignId: data.campaignId ?? keccak256("0x00"),
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
