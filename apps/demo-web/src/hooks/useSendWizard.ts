"use client";

import { useCallback, useRef, useState } from "react";
import { decodePaymasterAndData, encodePaymasterAndData, GasStationPaymasterAbi } from "@dotfuel/shared";
import { decodeEventLog, getAddress, hexToBigInt, parseAbi, toHex } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import type { InlineProgressStage } from "@/components/InlineProgressStepper";
import { fetchTokenQuote } from "@/lib/paymaster-client";
import { estimateUserOperationGas, sendUserOperation, waitForUserOperationReceipt } from "@/lib/bundlerClient";
import { getAccountNonce, getUserOperationHash } from "@/lib/entryPointClient";
import { type FlowResult, formatAmount } from "@/lib/flowResults";
import { getUserOpGasFees } from "@/lib/gasPriceClient";
import { appendTxHistory } from "@/lib/txHistory";
import { toUiError, type UiError } from "@/lib/uiError";
import { buildTokenModeBatchCalls, buildTokenModeUserOp, encodeExecuteBatch } from "@/lib/userOpBuilder";

const erc20MetadataAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]);

export type SendStep = "configure" | "review" | "execute" | "success" | "failed";

export interface QuoteContext {
  token: `0x${string}`;
  sender: `0x${string}`;
  initCode: `0x${string}`;
  callData: `0x${string}`;
  nonce: bigint;
  gasFees: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
  tokenDecimals: number;
  tokenSymbol: string;
  maxTokenCharge: bigint;
  /** token-smallest per native-smallest × 1e18 — used for PAS equivalent display */
  tokenPerNativeScaled: bigint;
  permit2TypedData: unknown;
  paymasterAndDataNoPermitSig: string;
  requiresDeployment: boolean;
}

export function useSendWizard() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [step, setStep] = useState<SendStep>("configure");
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isSigningPermit2, setIsSigningPermit2] = useState(false);
  const [quoteCtx, setQuoteCtx] = useState<QuoteContext | null>(null);
  const permit2SigRef = useRef<`0x${string}` | null>(null);
  const [result, setResult] = useState<FlowResult | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [progressStage, setProgressStage] = useState<InlineProgressStage | null>(null);
  const [progressStartedAt, setProgressStartedAt] = useState<number | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!address || !walletClient || !publicClient) {
      setError(toUiError("Wallet not connected", "token"));
      return;
    }

    setIsFetchingQuote(true);
    setError(null);

    try {
      const token = getAddress(process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`);
      const permit2 = getAddress(process.env.NEXT_PUBLIC_PERMIT2_ADDRESS as `0x${string}`);
      const demoDapp = getAddress(process.env.NEXT_PUBLIC_DEMO_DAPP_ADDRESS as `0x${string}`);
      const entryPoint = getAddress(process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS as `0x${string}`);
      const sender = getAddress((process.env.NEXT_PUBLIC_COUNTERFACTUAL_ADDRESS as `0x${string}`) || address);
      const initCode = (process.env.NEXT_PUBLIC_ACCOUNT_INIT_CODE as `0x${string}` | undefined) ?? "0x";

      const senderCode = await publicClient.getCode({ address: sender });
      const requiresDeployment = !senderCode || senderCode === "0x";

      const calls = buildTokenModeBatchCalls({
        token, permit2, demoDapp,
        maxApproveAmount: 2n ** 256n - 1n,
        message: "Hello DotFuel!"
      });
      const callData = encodeExecuteBatch(calls);
      const gasFees = await getUserOpGasFees(publicClient);
      const nonce = await getAccountNonce(publicClient, entryPoint, sender);

      const quote = await fetchTokenQuote({
        chainId: walletClient.chain?.id ?? 420420417,
        sender, callData, initCode, token,
        maxFeePerGas: toHex(gasFees.maxFeePerGas),
        maxPriorityFeePerGas: toHex(gasFees.maxPriorityFeePerGas)
      });

      const [decimalsResult, symbolResult] = await Promise.allSettled([
        publicClient.readContract({ address: token, abi: erc20MetadataAbi, functionName: "decimals" }),
        publicClient.readContract({ address: token, abi: erc20MetadataAbi, functionName: "symbol" })
      ]);

      const tokenDecimals = decimalsResult.status === "fulfilled" ? Number(decimalsResult.value) : 6;
      const tokenSymbol = symbolResult.status === "fulfilled" ? symbolResult.value : "tUSDT";

      setQuoteCtx({
        token, sender, initCode, callData, nonce, gasFees,
        tokenDecimals, tokenSymbol,
        maxTokenCharge: hexToBigInt(quote.maxTokenCharge as `0x${string}`),
        tokenPerNativeScaled: hexToBigInt(quote.tokenPerNativeScaled as `0x${string}`),
        permit2TypedData: quote.permit2TypedData,
        paymasterAndDataNoPermitSig: quote.paymasterAndDataNoPermitSig,
        requiresDeployment
      });
      setStep("review");
    } catch (err) {
      setError(toUiError(err, "token"));
    } finally {
      setIsFetchingQuote(false);
    }
  }, [address, walletClient, publicClient]);

  const signPermit2 = useCallback(async () => {
    if (!walletClient || !quoteCtx) {
      setError(toUiError("Missing wallet or quote", "token"));
      return;
    }

    setIsSigningPermit2(true);
    setError(null);

    try {
      const sig = await walletClient.signTypedData(quoteCtx.permit2TypedData as Parameters<typeof walletClient.signTypedData>[0]);
      permit2SigRef.current = sig;
      setStep("execute");
    } catch (err) {
      setError(toUiError(err, "token"));
    } finally {
      setIsSigningPermit2(false);
    }
  }, [walletClient, quoteCtx]);

  const executeUserOp = useCallback(async () => {
    if (!address || !walletClient || !publicClient || !quoteCtx || !permit2SigRef.current) {
      setError(toUiError("Missing required state", "token"));
      return;
    }

    setError(null);
    setProgressStage("signing");
    setProgressStartedAt(Date.now());

    try {
      const {
        sender, initCode, callData, gasFees, nonce,
        token, tokenDecimals, tokenSymbol,
        paymasterAndDataNoPermitSig, requiresDeployment, maxTokenCharge
      } = quoteCtx;
      const entryPoint = getAddress(process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS as `0x${string}`);

      const decodedPmd = decodePaymasterAndData(paymasterAndDataNoPermitSig as `0x${string}`);
      const paymasterAndData = encodePaymasterAndData(decodedPmd.paymasterAddress, {
        ...decodedPmd.data,
        permit2Signature: permit2SigRef.current
      });

      let userOp = buildTokenModeUserOp({ sender, nonce, initCode, callData, paymasterAndData });
      userOp = { ...userOp, ...gasFees, paymasterAndData };

      const gasEstimate = await estimateUserOperationGas(userOp, entryPoint);
      userOp = {
        ...userOp,
        callGasLimit: hexToBigInt(gasEstimate.callGasLimit),
        verificationGasLimit: hexToBigInt(gasEstimate.verificationGasLimit),
        preVerificationGas: hexToBigInt(gasEstimate.preVerificationGas)
      };

      const userOpHash = await getUserOperationHash(publicClient, entryPoint, userOp);
      userOp.signature = await walletClient.signMessage({ message: { raw: userOpHash } });

      setProgressStage("submitting");
      const submittedUserOpHash = await sendUserOperation(userOp, entryPoint);

      setProgressStage("waiting");
      const receipt = await waitForUserOperationReceipt(submittedUserOpHash);
      const txHash = receipt?.receipt?.transactionHash;
      const explorerUrl = txHash ? `https://blockscout-testnet.polkadot.io/tx/${txHash}` : undefined;

      let gasCost =
        (userOp.callGasLimit + userOp.verificationGasLimit + userOp.preVerificationGas) * userOp.maxFeePerGas;
      let tokenCharge = maxTokenCharge;

      if (txHash) {
        const txReceipt = await publicClient.getTransactionReceipt({ hash: txHash });
        for (const log of txReceipt.logs) {
          try {
            const decodedLog = decodeEventLog({ abi: GasStationPaymasterAbi, data: log.data, topics: log.topics });
            const args = decodedLog.args as { gasCost: bigint; charge: bigint } | undefined;
            if (decodedLog.eventName === "TokenGasPaid" && args) {
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

      const flowResult: FlowResult = {
        mode: "token",
        hash: txHash ?? submittedUserOpHash,
        userOpHash: submittedUserOpHash,
        txHash,
        explorerUrl,
        gasCostLabel,
        settlementLabel: txHash
          ? `${tokenChargeLabel} charged`
          : `Waiting to settle up to ${tokenChargeLabel}`,
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
            title: `${tokenSymbol} settled`,
            detail: txHash
              ? `${tokenChargeLabel} covered ${gasCostLabel}`
              : "Bundler receipt still pending.",
            status: txHash ? "done" : "pending"
          }
        ]
      };

      setResult(flowResult);
      appendTxHistory({
        mode: "token",
        hash: txHash ?? submittedUserOpHash,
        explorerUrl,
        gasCostLabel,
        settlementLabel: flowResult.settlementLabel,
        createdAt: Date.now()
      });
      setStep("success");
    } catch (err) {
      setError(toUiError(err, "token"));
      setProgressStage(null);
      setProgressStartedAt(null);
      setStep("failed");
    }
  }, [address, walletClient, publicClient, quoteCtx]);

  const reset = useCallback(() => {
    setStep("configure");
    setIsFetchingQuote(false);
    setIsSigningPermit2(false);
    setQuoteCtx(null);
    permit2SigRef.current = null;
    setResult(null);
    setError(null);
    setProgressStage(null);
    setProgressStartedAt(null);
  }, []);

  return {
    step,
    isFetchingQuote,
    isSigningPermit2,
    quoteCtx,
    result,
    error,
    progressStage,
    progressStartedAt,
    fetchQuote,
    signPermit2,
    executeUserOp,
    reset
  };
}
