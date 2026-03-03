import { toHex } from "viem";
import type { Hex } from "viem";

import type { UserOp } from "@dotfuel/shared";

const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL ?? "http://localhost:4337";

async function jsonRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(bundlerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });

  const body = await res.json();
  if (body.error) {
    throw new Error(body.error.message ?? `RPC error: ${method}`);
  }
  return body.result as T;
}

function toRpcUserOp(userOp: UserOp) {
  return {
    sender: userOp.sender,
    nonce: toHex(userOp.nonce),
    initCode: userOp.initCode,
    callData: userOp.callData,
    callGasLimit: toHex(userOp.callGasLimit),
    verificationGasLimit: toHex(userOp.verificationGasLimit),
    preVerificationGas: toHex(userOp.preVerificationGas),
    maxFeePerGas: toHex(userOp.maxFeePerGas),
    maxPriorityFeePerGas: toHex(userOp.maxPriorityFeePerGas),
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature
  };
}

export async function estimateUserOperationGas(userOp: UserOp, entryPoint: Hex) {
  return jsonRpc<{ callGasLimit: Hex; verificationGasLimit: Hex; preVerificationGas: Hex }>(
    "eth_estimateUserOperationGas",
    [toRpcUserOp(userOp), entryPoint]
  );
}

export async function sendUserOperation(userOp: UserOp, entryPoint: Hex) {
  return jsonRpc<Hex>("eth_sendUserOperation", [toRpcUserOp(userOp), entryPoint]);
}

export async function getUserOperationReceipt(userOpHash: Hex) {
  return jsonRpc<{ receipt?: { transactionHash?: Hex } } | null>("eth_getUserOperationReceipt", [userOpHash]);
}

export async function waitForUserOperationReceipt(userOpHash: Hex, attempts = 20, intervalMs = 1500) {
  for (let i = 0; i < attempts; i += 1) {
    const receipt = await getUserOperationReceipt(userOpHash);
    if (receipt?.receipt?.transactionHash) {
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
