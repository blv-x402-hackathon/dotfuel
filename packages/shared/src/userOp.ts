import type { Address, Hex } from "viem";

import type { UserOp } from "./types";

export function emptyUserOp(sender: Address): UserOp {
  return {
    sender,
    nonce: 0n,
    initCode: "0x",
    callData: "0x",
    callGasLimit: 0n,
    verificationGasLimit: 0n,
    preVerificationGas: 0n,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    paymasterAndData: "0x",
    signature: "0x"
  };
}

export function withPaymasterAndData(userOp: UserOp, paymasterAndData: Hex): UserOp {
  return {
    ...userOp,
    paymasterAndData
  };
}
