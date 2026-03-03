"use client";

import { useState } from "react";
import { decodePaymasterAndData, encodePaymasterAndData } from "@dotfuel/shared";
import { getAddress, hexToBigInt, keccak256, toBytes } from "viem";
import { useAccount, useWalletClient } from "wagmi";

import { fetchTokenQuote } from "@/lib/paymaster-client";
import {
  estimateUserOperationGas,
  sendUserOperation,
  waitForUserOperationReceipt
} from "@/lib/bundlerClient";
import {
  buildTokenModeBatchCalls,
  buildTokenModeUserOp,
  encodeExecuteBatch
} from "@/lib/userOpBuilder";

interface TokenModeResult {
  userOpHash: string;
  txHash?: string;
  explorerUrl?: string;
}

export function useTokenModeUserOp() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TokenModeResult | null>(null);

  async function executeTokenMode() {
    if (!address || !walletClient) {
      setError("Wallet not connected");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = getAddress(process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`);
      const permit2 = getAddress(process.env.NEXT_PUBLIC_PERMIT2_ADDRESS as `0x${string}`);
      const demoDapp = getAddress(process.env.NEXT_PUBLIC_DEMO_DAPP_ADDRESS as `0x${string}`);
      const entryPoint = getAddress(process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS as `0x${string}`);

      const sender = getAddress((process.env.NEXT_PUBLIC_COUNTERFACTUAL_ADDRESS as `0x${string}`) || address);
      const initCode = (process.env.NEXT_PUBLIC_ACCOUNT_INIT_CODE as `0x${string}` | undefined) ?? "0x";

      const calls = buildTokenModeBatchCalls({
        token,
        permit2,
        demoDapp,
        maxApproveAmount: 2n ** 256n - 1n,
        message: "Hello DotFuel!"
      });
      const callData = encodeExecuteBatch(calls);

      let userOp = buildTokenModeUserOp({
        sender,
        initCode,
        callData,
        paymasterAndData: "0x"
      });

      const quote = await fetchTokenQuote({
        chainId: walletClient.chain?.id ?? 420420417,
        sender,
        callData,
        initCode,
        token,
        maxFeePerGas: "0x1",
        maxPriorityFeePerGas: "0x1"
      });

      const permit2Signature = await walletClient.signTypedData(quote.permit2TypedData as any);

      const decoded = decodePaymasterAndData(quote.paymasterAndDataNoPermitSig as `0x${string}`);
      const paymasterAndData = encodePaymasterAndData(decoded.paymasterAddress, {
        ...decoded.data,
        permit2Signature: permit2Signature as `0x${string}`
      });

      userOp = {
        ...userOp,
        paymasterAndData
      };

      const gasEstimate = await estimateUserOperationGas(userOp, entryPoint);
      userOp = {
        ...userOp,
        callGasLimit: hexToBigInt(gasEstimate.callGasLimit),
        verificationGasLimit: hexToBigInt(gasEstimate.verificationGasLimit),
        preVerificationGas: hexToBigInt(gasEstimate.preVerificationGas)
      };

      const pseudoUserOpHash = keccak256(
        toBytes(
          JSON.stringify({
            ...userOp,
            nonce: userOp.nonce.toString(),
            callGasLimit: userOp.callGasLimit.toString(),
            verificationGasLimit: userOp.verificationGasLimit.toString(),
            preVerificationGas: userOp.preVerificationGas.toString(),
            maxFeePerGas: userOp.maxFeePerGas.toString(),
            maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString()
          })
        )
      );
      userOp.signature = await walletClient.signMessage({
        message: { raw: pseudoUserOpHash }
      });

      const userOpHash = await sendUserOperation(userOp, entryPoint);
      const receipt = await waitForUserOperationReceipt(userOpHash);
      const txHash = receipt?.receipt?.transactionHash;

      const explorerUrl = txHash ? `https://blockscout-testnet.polkadot.io/tx/${txHash}` : undefined;

      setResult({
        userOpHash,
        txHash,
        explorerUrl
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute token mode flow");
    } finally {
      setIsLoading(false);
    }
  }

  return {
    executeTokenMode,
    isLoading,
    error,
    result
  };
}
