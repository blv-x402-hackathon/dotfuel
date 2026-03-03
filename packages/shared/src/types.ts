import type { Address, Hex } from "viem";

export interface PaymasterData {
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
}

export interface UserOp {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}
