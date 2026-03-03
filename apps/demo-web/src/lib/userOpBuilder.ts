import { encodeFunctionData, parseAbi } from "viem";
import type { Address, Hex } from "viem";

import type { UserOp } from "@dotfuel/shared";

const accountAbi = parseAbi([
  "function executeBatch((address to, uint256 value, bytes data)[] calls)"
]);

const erc20Abi = parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]);
const demoDappAbi = parseAbi(["function execute(string message)"]);

export interface BatchCall {
  to: Address;
  value: bigint;
  data: Hex;
}

export function buildTokenModeBatchCalls(params: {
  token: Address;
  permit2: Address;
  demoDapp: Address;
  maxApproveAmount: bigint;
  message: string;
}): BatchCall[] {
  return [
    {
      to: params.token,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [params.permit2, params.maxApproveAmount]
      })
    },
    {
      to: params.demoDapp,
      value: 0n,
      data: encodeFunctionData({
        abi: demoDappAbi,
        functionName: "execute",
        args: [params.message]
      })
    }
  ];
}

export function encodeExecuteBatch(calls: BatchCall[]): Hex {
  return encodeFunctionData({
    abi: accountAbi,
    functionName: "executeBatch",
    args: [calls]
  });
}

export function buildTokenModeUserOp(params: {
  sender: Address;
  initCode?: Hex;
  callData: Hex;
  paymasterAndData: Hex;
}): UserOp {
  return {
    sender: params.sender,
    nonce: 0n,
    initCode: params.initCode ?? "0x",
    callData: params.callData,
    callGasLimit: 0n,
    verificationGasLimit: 0n,
    preVerificationGas: 0n,
    maxFeePerGas: 1n,
    maxPriorityFeePerGas: 1n,
    paymasterAndData: params.paymasterAndData,
    signature: "0x"
  };
}
