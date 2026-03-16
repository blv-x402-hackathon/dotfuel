"use client";

import { useState } from "react";
import { getAddress, hexToBigInt } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { fetchSponsorQuote } from "@/lib/paymaster-client";
import {
  estimateUserOperationGas,
  sendUserOperation,
  waitForUserOperationReceipt
} from "@/lib/bundlerClient";
import { getUserOperationHash } from "@/lib/entryPointClient";
import { buildTokenModeUserOp, encodeExecuteBatch } from "@/lib/userOpBuilder";

interface SponsorResult {
  userOpHash: string;
  txHash?: string;
  explorerUrl?: string;
}

export function useSponsorModeUserOp() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SponsorResult | null>(null);

  async function executeSponsored() {
    if (!address || !walletClient || !publicClient) {
      setError("Wallet not connected");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const entryPoint = getAddress(process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS as `0x${string}`);
      const demoDapp = getAddress(process.env.NEXT_PUBLIC_DEMO_DAPP_ADDRESS as `0x${string}`);
      const campaignId = process.env.NEXT_PUBLIC_CAMPAIGN_ID as `0x${string}`;

      const sender = getAddress((process.env.NEXT_PUBLIC_COUNTERFACTUAL_ADDRESS as `0x${string}`) || address);
      const initCode = (process.env.NEXT_PUBLIC_ACCOUNT_INIT_CODE as `0x${string}` | undefined) ?? "0x";

      const callData = encodeExecuteBatch([
        {
          to: demoDapp,
          value: 0n,
          data: "0x5c36b1860000000000000000000000000000000000000000000000000000000000000020"
        }
      ]);

      let userOp = buildTokenModeUserOp({
        sender,
        initCode,
        callData,
        paymasterAndData: "0x"
      });

      const quote = await fetchSponsorQuote({
        chainId: walletClient.chain?.id ?? 420420417,
        sender,
        callData,
        initCode,
        campaignId
      });

      userOp = {
        ...userOp,
        paymasterAndData: quote.paymasterAndData
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

      setResult({ userOpHash: submittedUserOpHash, txHash, explorerUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute sponsor mode flow");
    } finally {
      setIsLoading(false);
    }
  }

  return {
    executeSponsored,
    isLoading,
    error,
    result
  };
}
