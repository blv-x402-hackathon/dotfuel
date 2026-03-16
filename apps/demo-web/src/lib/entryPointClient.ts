import { parseAbi } from "viem";
import type { Address, PublicClient } from "viem";

import type { UserOp } from "@dotfuel/shared";

const entryPointAbi = parseAbi([
  "function getUserOpHash((address sender,uint256 nonce,bytes initCode,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,bytes paymasterAndData,bytes signature) userOp) view returns (bytes32)",
  "function getNonce(address sender, uint192 key) view returns (uint256)"
]);

export async function getUserOperationHash(publicClient: PublicClient, entryPoint: Address, userOp: UserOp) {
  return publicClient.readContract({
    address: entryPoint,
    abi: entryPointAbi,
    functionName: "getUserOpHash",
    args: [userOp]
  });
}

export async function getAccountNonce(publicClient: PublicClient, entryPoint: Address, sender: Address) {
  return publicClient.readContract({
    address: entryPoint,
    abi: entryPointAbi,
    functionName: "getNonce",
    args: [sender, 0n]
  });
}
