import type { Hex } from "viem";

import { publicClient } from "../client";

export interface UserOpGasEstimate {
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
}

interface EstimateInput {
  sender: Hex;
  callData: Hex;
  initCode: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymasterAndData: Hex;
}

export async function estimateUserOperationGas(input: EstimateInput): Promise<UserOpGasEstimate> {
  try {
    const result = (await (publicClient as any).request({
      method: "eth_estimateUserOperationGas",
      params: [
        {
          sender: input.sender,
          nonce: "0x0",
          initCode: input.initCode,
          callData: input.callData,
          callGasLimit: "0x0",
          verificationGasLimit: "0x0",
          preVerificationGas: "0x0",
          maxFeePerGas: input.maxFeePerGas,
          maxPriorityFeePerGas: input.maxPriorityFeePerGas,
          paymasterAndData: input.paymasterAndData,
          signature: "0x"
        },
        "latest"
      ]
    })) as {
      callGasLimit: Hex;
      verificationGasLimit: Hex;
      preVerificationGas: Hex;
    };

    return {
      callGasLimit: BigInt(result.callGasLimit),
      verificationGasLimit: BigInt(result.verificationGasLimit),
      preVerificationGas: BigInt(result.preVerificationGas)
    };
  } catch {
    return {
      callGasLimit: 300_000n,
      verificationGasLimit: 300_000n,
      preVerificationGas: 75_000n
    };
  }
}
