import { http, createPublicClient, createWalletClient, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { config } from "./config";

export const polkadotHubTestnet = defineChain({
  id: config.CHAIN_ID,
  name: "Polkadot Hub TestNet",
  nativeCurrency: {
    name: "PAS",
    symbol: "PAS",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [config.RPC_URL_TESTNET]
    }
  }
});

export const publicClient = createPublicClient({
  chain: polkadotHubTestnet,
  transport: http(config.RPC_URL_TESTNET)
});

const signer = privateKeyToAccount(config.QUOTE_SIGNER_PRIVATE_KEY as `0x${string}`);

export const quoteSignerClient = createWalletClient({
  account: signer,
  chain: polkadotHubTestnet,
  transport: http(config.RPC_URL_TESTNET)
});
