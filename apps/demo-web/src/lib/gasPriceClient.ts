import type { PublicClient } from "viem";

export async function getUserOpGasFees(publicClient: PublicClient) {
  const gasPrice = await publicClient.getGasPrice();

  try {
    const priorityFee = await publicClient.estimateMaxPriorityFeePerGas();
    return {
      maxFeePerGas: gasPrice + priorityFee,
      maxPriorityFeePerGas: priorityFee
    };
  } catch {
    return {
      maxFeePerGas: gasPrice,
      maxPriorityFeePerGas: gasPrice
    };
  }
}
