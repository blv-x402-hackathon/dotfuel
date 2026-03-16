"use client";

import { useState } from "react";
import { decodePaymasterAndData, encodePaymasterAndData } from "@dotfuel/shared";
import { getAddress, hexToBigInt, toHex } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { fetchTokenQuote } from "@/lib/paymaster-client";
import {
  estimateUserOperationGas,
  sendUserOperation,
  waitForUserOperationReceipt
} from "@/lib/bundlerClient";
import { getUserOperationHash } from "@/lib/entryPointClient";
import { getUserOpGasFees } from "@/lib/gasPriceClient";
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
  const publicClient = usePublicClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TokenModeResult | null>(null);

  async function executeTokenMode() {
    if (!address || !walletClient || !publicClient) {
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
      const gasFees = await getUserOpGasFees(publicClient);

      let userOp = buildTokenModeUserOp({
        sender,
        initCode,
        callData,
        paymasterAndData: "0x"
      });
      userOp = {
        ...userOp,
        ...gasFees
      };

      const quote = await fetchTokenQuote({
        chainId: walletClient.chain?.id ?? 420420417,
        sender,
        callData,
        initCode,
        token,
        maxFeePerGas: toHex(gasFees.maxFeePerGas),
        maxPriorityFeePerGas: toHex(gasFees.maxPriorityFeePerGas)
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

      const userOpHash = await getUserOperationHash(publicClient, entryPoint, userOp);
      userOp.signature = await walletClient.signMessage({
        message: { raw: userOpHash }
      });

      const submittedUserOpHash = await sendUserOperation(userOp, entryPoint);
      const receipt = await waitForUserOperationReceipt(submittedUserOpHash);
      const txHash = receipt?.receipt?.transactionHash;

      const explorerUrl = txHash ? `https://blockscout-testnet.polkadot.io/tx/${txHash}` : undefined;

      setResult({
        userOpHash: submittedUserOpHash,
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
