"use client";

import { useState } from "react";
import { decodePaymasterAndData, encodePaymasterAndData } from "@dotfuel/shared";
import { GasStationPaymasterAbi } from "@dotfuel/shared";
import { decodeEventLog, hexToBigInt, parseAbi, toHex } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import type { InlineProgressStage } from "@/components/InlineProgressStepper";
import { buildAccountInitCode } from "@/lib/accountInitCode";
import { fetchTokenQuote } from "@/lib/paymaster-client";
import {
  estimateUserOperationGas,
  sendUserOperation,
  waitForUserOperationReceipt
} from "@/lib/bundlerClient";
import { getAccountNonce, getUserOperationHash } from "@/lib/entryPointClient";
import { type FlowResult, formatAmount } from "@/lib/flowResults";
import { getUserOpGasFees } from "@/lib/gasPriceClient";
import { toUiError, type UiError } from "@/lib/uiError";
import { useCounterfactualAddress } from "@/hooks/useCounterfactualAddress";
import { resolveCounterfactualAddress } from "@/lib/counterfactual";
import { requireEnvAddress } from "@/lib/envAddress";
import {
  buildTokenModeBatchCalls,
  buildTokenModeUserOp,
  encodeExecuteBatch
} from "@/lib/userOpBuilder";

const erc20MetadataAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]);

export function useTokenModeUserOp() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address: smartAccountAddress, status: smartAccountStatus, error: smartAccountError } = useCounterfactualAddress();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [result, setResult] = useState<FlowResult | null>(null);
  const [progressStage, setProgressStage] = useState<InlineProgressStage | null>(null);
  const [progressStartedAt, setProgressStartedAt] = useState<number | null>(null);

  async function executeTokenMode() {
    if (!address || !walletClient || !publicClient) {
      setError(toUiError("Wallet not connected", "token"));
      return;
    }
    if (smartAccountStatus === "error") {
      setError(toUiError(smartAccountError ?? "Failed to derive smart account", "token"));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgressStage("signing");
    setProgressStartedAt(Date.now());

    try {
      const token = requireEnvAddress(process.env.NEXT_PUBLIC_TOKEN_ADDRESS, "NEXT_PUBLIC_TOKEN_ADDRESS");
      const permit2 = requireEnvAddress(process.env.NEXT_PUBLIC_PERMIT2_ADDRESS, "NEXT_PUBLIC_PERMIT2_ADDRESS");
      const demoDapp = requireEnvAddress(process.env.NEXT_PUBLIC_DEMO_DAPP_ADDRESS, "NEXT_PUBLIC_DEMO_DAPP_ADDRESS");
      const entryPoint = requireEnvAddress(process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS, "NEXT_PUBLIC_ENTRYPOINT_ADDRESS");

      const sender = smartAccountAddress ?? await resolveCounterfactualAddress(publicClient, address);
      const senderCode = await publicClient.getCode({ address: sender });
      const requiresDeployment = !senderCode || senderCode === "0x";
      const initCode = buildAccountInitCode(address, requiresDeployment);

      const calls = buildTokenModeBatchCalls({
        token,
        permit2,
        demoDapp,
        maxApproveAmount: 2n ** 256n - 1n,
        message: "Hello DotFuel!"
      });
      const callData = encodeExecuteBatch(calls);
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

      setProgressStage("submitting");
      const submittedUserOpHash = await sendUserOperation(userOp, entryPoint);
      setProgressStage("waiting");
      const receipt = await waitForUserOperationReceipt(submittedUserOpHash);
      const txHash = receipt?.receipt?.transactionHash;
      const explorerUrl = txHash ? `https://blockscout-testnet.polkadot.io/tx/${txHash}` : undefined;
      const [decimalsResult, symbolResult] = await Promise.allSettled([
        publicClient.readContract({
          address: token,
          abi: erc20MetadataAbi,
          functionName: "decimals"
        }),
        publicClient.readContract({
          address: token,
          abi: erc20MetadataAbi,
          functionName: "symbol"
        })
      ]);

      const tokenDecimals = decimalsResult.status === "fulfilled" ? Number(decimalsResult.value) : 6;
      const tokenSymbol = symbolResult.status === "fulfilled" ? symbolResult.value : "tUSDT";
      let gasCost = (
        userOp.callGasLimit + userOp.verificationGasLimit + userOp.preVerificationGas
      ) * userOp.maxFeePerGas;
      let tokenCharge = hexToBigInt(quote.maxTokenCharge as `0x${string}`);

      if (txHash) {
        const txReceipt = await publicClient.getTransactionReceipt({ hash: txHash });

        for (const log of txReceipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: GasStationPaymasterAbi,
              data: log.data,
              topics: log.topics
            });
            const args = decoded.args as { gasCost: bigint; charge: bigint } | undefined;

            if (decoded.eventName === "TokenGasPaid" && args) {
              gasCost = args.gasCost;
              tokenCharge = args.charge;
              break;
            }
          } catch {}
        }
      }

      const gasCostLabel = `${formatAmount(gasCost, 18, 6)} PAS`;
      const tokenChargeLabel = `${formatAmount(tokenCharge, tokenDecimals, 4)} ${tokenSymbol}`;

      setProgressStage("done");
      setResult({
        mode: "token",
        hash: txHash ?? submittedUserOpHash,
        userOpHash: submittedUserOpHash,
        txHash,
        explorerUrl,
        gasCostLabel,
        settlementLabel: txHash ? `${tokenChargeLabel} charged` : `Waiting to settle up to ${tokenChargeLabel}`,
        timeline: [
          {
            title: requiresDeployment ? "Account deployed" : "Account already live",
            detail: sender,
            status: "done"
          },
          {
            title: "Permit2 approved",
            detail: "ERC-20 approval batched inside the smart account call.",
            status: "done"
          },
          {
            title: "Contract executed",
            detail: "executeBatch forwarded the Hello DotFuel action.",
            status: "done"
          },
          {
            title: "tUSDT settled",
            detail: txHash ? `${tokenChargeLabel} covered ${gasCostLabel}` : "Bundler receipt still pending.",
            status: txHash ? "done" : "pending"
          }
        ]
      });
    } catch (err) {
      setError(toUiError(err, "token"));
      setProgressStage(null);
      setProgressStartedAt(null);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    executeTokenMode,
    isLoading,
    error,
    result,
    progressStage,
    progressStartedAt
  };
}
