"use client";

import { useState } from "react";
import { GasStationPaymasterAbi } from "@dotfuel/shared";
import { decodeEventLog, getAddress, hexToBigInt } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import type { InlineProgressStage } from "@/components/InlineProgressStepper";
import { fetchSponsorQuote } from "@/lib/paymaster-client";
import {
  estimateUserOperationGas,
  sendUserOperation,
  waitForUserOperationReceipt
} from "@/lib/bundlerClient";
import { getAccountNonce, getUserOperationHash } from "@/lib/entryPointClient";
import { type FlowResult, formatAmount } from "@/lib/flowResults";
import { getUserOpGasFees } from "@/lib/gasPriceClient";
import { toUiError, type UiError } from "@/lib/uiError";
import { buildTokenModeUserOp, encodeExecuteBatch } from "@/lib/userOpBuilder";

export function useSponsorModeUserOp(campaignId: `0x${string}`) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [result, setResult] = useState<FlowResult | null>(null);
  const [progressStage, setProgressStage] = useState<InlineProgressStage | null>(null);
  const [progressStartedAt, setProgressStartedAt] = useState<number | null>(null);

  async function executeSponsored() {
    if (!address || !walletClient || !publicClient) {
      setError(toUiError("Wallet not connected", "sponsor"));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgressStage("signing");
    setProgressStartedAt(Date.now());

    try {
      const entryPoint = getAddress(process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS as `0x${string}`);
      const demoDapp = getAddress(process.env.NEXT_PUBLIC_DEMO_DAPP_ADDRESS as `0x${string}`);
      const sender = getAddress((process.env.NEXT_PUBLIC_COUNTERFACTUAL_ADDRESS as `0x${string}`) || address);
      const initCode = (process.env.NEXT_PUBLIC_ACCOUNT_INIT_CODE as `0x${string}` | undefined) ?? "0x";
      const senderCode = await publicClient.getCode({ address: sender });
      const requiresDeployment = !senderCode || senderCode === "0x";

      const callData = encodeExecuteBatch([
        {
          to: demoDapp,
          value: 0n,
          data: "0x5c36b1860000000000000000000000000000000000000000000000000000000000000020"
        }
      ]);
      const gasFees = await getUserOpGasFees(publicClient);
      const nonce = await getAccountNonce(publicClient, entryPoint, sender);

      let userOp = buildTokenModeUserOp({
        sender,
        nonce,
        initCode,
        callData,
        paymasterAndData: "0x"
      });
      userOp = {
        ...userOp,
        ...gasFees
      };

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

      setProgressStage("submitting");
      const submittedUserOpHash = await sendUserOperation(userOp, entryPoint);
      setProgressStage("waiting");
      const receipt = await waitForUserOperationReceipt(submittedUserOpHash);
      const txHash = receipt?.receipt?.transactionHash;
      const explorerUrl = txHash ? `https://blockscout-testnet.polkadot.io/tx/${txHash}` : undefined;
      let gasCost = (
        userOp.callGasLimit + userOp.verificationGasLimit + userOp.preVerificationGas
      ) * userOp.maxFeePerGas;

      if (txHash) {
        const txReceipt = await publicClient.getTransactionReceipt({ hash: txHash });

        for (const log of txReceipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: GasStationPaymasterAbi,
              data: log.data,
              topics: log.topics
            });
            const args = decoded.args as { gasCost: bigint } | undefined;

            if (decoded.eventName === "Sponsored" && args) {
              gasCost = args.gasCost;
              break;
            }
          } catch {}
        }
      }

      const gasCostLabel = `${formatAmount(gasCost, 18, 6)} PAS`;
      setProgressStage("done");
      setResult({
        mode: "sponsor",
        hash: txHash ?? submittedUserOpHash,
        userOpHash: submittedUserOpHash,
        txHash,
        explorerUrl,
        gasCostLabel,
        settlementLabel: txHash ? `Campaign ${campaignId.slice(0, 10)}... paid the gas` : "Waiting for sponsor settlement",
        timeline: [
          {
            title: requiresDeployment ? "Account deployed" : "Account already live",
            detail: sender,
            status: "done"
          },
          {
            title: "Sponsor quote attached",
            detail: `Campaign ${campaignId.slice(0, 10)}... signed by the paymaster API.`,
            status: "done"
          },
          {
            title: "DemoDapp called",
            detail: "The same smart account action executed without token spend.",
            status: "done"
          },
          {
            title: "Campaign settled gas",
            detail: txHash ? `${gasCostLabel} charged against the campaign budget.` : "Bundler receipt still pending.",
            status: txHash ? "done" : "pending"
          }
        ]
      });
    } catch (err) {
      setError(toUiError(err, "sponsor"));
      setProgressStage(null);
      setProgressStartedAt(null);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    executeSponsored,
    isLoading,
    error,
    result,
    progressStage,
    progressStartedAt
  };
}
