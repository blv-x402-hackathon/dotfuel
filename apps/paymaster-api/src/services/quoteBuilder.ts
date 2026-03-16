import {
  concatHex,
  encodeAbiParameters,
  getAddress,
  hexToBigInt,
  keccak256,
  parseAbi,
  toHex
} from "viem";
import type { Address, Hex } from "viem";

import { config } from "../config";
import { publicClient, quoteSignerClient } from "../client";
import { estimateUserOperationGas } from "./gasEstimator";
import { allocateNonce } from "./nonceAllocator";

const tokenRegistryAbi = parseAbi([
  "function tokenConfig(address token) view returns (bool enabled, uint8 decimals, uint16 markupBps, uint256 minMaxCharge, uint256 maxMaxCharge)"
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

const TOKEN_QUOTE_TYPE = {
  TokenQuote: [
    { name: "sender", type: "address" },
    { name: "callDataHash", type: "bytes32" },
    { name: "token", type: "address" },
    { name: "validUntil", type: "uint48" },
    { name: "maxTokenCharge", type: "uint256" },
    { name: "tokenPerNativeScaled", type: "uint256" },
    { name: "permit2Nonce", type: "uint256" },
    { name: "permit2Deadline", type: "uint256" }
  ]
} as const;

const PERMIT2_TYPES = {
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" }
  ],
  GasStationWitness: [
    { name: "sender", type: "address" },
    { name: "callDataHash", type: "bytes32" },
    { name: "token", type: "address" },
    { name: "maxTokenCharge", type: "uint256" },
    { name: "validUntil", type: "uint48" },
    { name: "treasury", type: "address" }
  ],
  PermitWitnessTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "witness", type: "GasStationWitness" }
  ]
} as const;

export interface TokenQuoteRequest {
  chainId: number;
  sender: string;
  callData: string;
  initCode: string;
  token: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export async function buildTokenQuote(req: TokenQuoteRequest) {
  const sender = getAddress(req.sender);
  const tokenAddress = getAddress(req.token);
  const callData = req.callData as Hex;
  const initCode = req.initCode as Hex;
  const maxFeePerGasHex = req.maxFeePerGas as Hex;
  const maxPriorityFeePerGasHex = req.maxPriorityFeePerGas as Hex;

  const tokenCfg = await publicClient.readContract({
    address: getAddress(config.TOKEN_REGISTRY_ADDRESS),
    abi: tokenRegistryAbi,
    functionName: "tokenConfig",
    args: [tokenAddress]
  });

  const [enabled, _decimals, markupBps, minMaxCharge, maxMaxCharge] = tokenCfg;
  if (!enabled) {
    throw new Error("token disabled");
  }

  const paymasterAddress = getAddress(config.PAYMASTER_ADDRESS);
  const gas = await estimateUserOperationGas({
    sender,
    callData,
    initCode,
    maxFeePerGas: maxFeePerGasHex,
    maxPriorityFeePerGas: maxPriorityFeePerGasHex,
    paymasterAndData: "0x"
  });

  const totalGas = gas.callGasLimit + gas.verificationGasLimit + gas.preVerificationGas;
  const maxFeePerGas = hexToBigInt(maxFeePerGasHex);
  const estimatedNative = totalGas * maxFeePerGas;

  // Hackathon mode: fixed 1:1 rate in 1e18 scale
  const tokenPerNativeScaled = 1_000_000_000_000_000_000n;

  const raw = ceilDiv(estimatedNative * tokenPerNativeScaled, 1_000_000_000_000_000_000n);
  const maxTokenChargeWithMarkup = raw + ceilDiv(raw * BigInt(markupBps), 10_000n);
  let maxTokenCharge = maxTokenChargeWithMarkup;
  if (maxTokenCharge < minMaxCharge) maxTokenCharge = minMaxCharge;
  if (maxTokenCharge > maxMaxCharge) maxTokenCharge = maxMaxCharge;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const validUntil = now + BigInt(config.QUOTE_TTL_SECONDS);
  const permit2Nonce = allocateNonce(sender);
  const permit2Deadline = validUntil;

  const callDataHash = keccak256(callData);

  const paymasterSignature = await quoteSignerClient.signTypedData({
    account: quoteSignerClient.account,
    domain: {
      name: "GasStationPaymaster",
      version: "1",
      chainId: req.chainId,
      verifyingContract: paymasterAddress
    },
    types: TOKEN_QUOTE_TYPE,
    primaryType: "TokenQuote",
    message: {
      sender,
      callDataHash,
      token: tokenAddress,
      validUntil: Number(validUntil),
      maxTokenCharge,
      tokenPerNativeScaled,
      permit2Nonce,
      permit2Deadline
    }
  });

  const permit2TypedData = {
    domain: {
      name: "Permit2",
      version: "1",
      chainId: req.chainId,
      verifyingContract: getAddress(config.PERMIT2_ADDRESS)
    },
    types: PERMIT2_TYPES,
    primaryType: "PermitWitnessTransferFrom",
    message: {
      permitted: {
        token: tokenAddress,
        amount: maxTokenCharge
      },
      spender: paymasterAddress,
      nonce: permit2Nonce,
      deadline: permit2Deadline,
      witness: {
        sender,
        callDataHash,
        token: tokenAddress,
        maxTokenCharge,
        validUntil: Number(validUntil),
        treasury: getAddress(config.TREASURY_ADDRESS)
      }
    }
  };

  const paymasterAndDataNoPermitSig = encodePaymasterAndData(paymasterAddress, {
    mode: 2,
    validUntil,
    signature: paymasterSignature,
    token: tokenAddress,
    maxTokenCharge,
    tokenPerNativeScaled,
    permit2Nonce,
    permit2Deadline,
    permit2Signature: "0x"
  });

  return {
    mode: "token",
    chainId: req.chainId,
    sender,
    token: tokenAddress,
    callDataHash,
    validUntil: toHex(validUntil),
    tokenPerNativeScaled: toHex(tokenPerNativeScaled),
    maxTokenCharge: toHex(maxTokenCharge),
    permit2Nonce: toHex(permit2Nonce),
    permit2Deadline: toHex(permit2Deadline),
    paymasterSignature,
    paymasterAndDataNoPermitSig,
    permit2TypedData,
    gasEstimate: {
      callGasLimit: toHex(gas.callGasLimit),
      verificationGasLimit: toHex(gas.verificationGasLimit),
      preVerificationGas: toHex(gas.preVerificationGas),
      usedFallback: gas.usedFallback
    },
    warnings: gas.usedFallback ? [`Gas estimation fallback used: ${gas.estimationError ?? "unknown error"}`] : []
  };
}

function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

function encodePaymasterAndData(paymasterAddress: Address, data: {
  mode: 1 | 2;
  validUntil: bigint;
  signature: Hex;
  campaignId?: Hex;
  token?: Address;
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
    campaignId: data.campaignId ?? keccak256(toHex("campaign-default")),
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
