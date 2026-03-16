import dotenv from "dotenv";
import { createPublicClient, createWalletClient, getAddress, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { bootstrapViaAssetsPallet } from "./lib/assetsPallet";
import { assetIdToPrecompileAddress } from "./lib/precompile";

dotenv.config();

const tokenRegistryAbi = parseAbi([
  "function setToken(address token, (bool enabled,uint8 decimals,uint16 markupBps,uint256 minMaxCharge,uint256 maxMaxCharge) cfg)"
]);

async function main() {
  const dryRun = process.env.DRY_RUN !== "false";
  const wssUrl = process.env.ASSET_HUB_WSS ?? "wss://asset-hub-paseo-rpc.n.dwellir.com";
  const assetIdHint = Number(process.env.ASSET_ID_HINT ?? "1984");
  const counterfactualRecipient =
    process.env.COUNTERFACTUAL_ADDRESS ?? process.env.NEXT_PUBLIC_COUNTERFACTUAL_ADDRESS;
  const userRecipient = process.env.TEST_USER_ADDRESS ?? process.env.DEMO_USER_ADDRESS;

  const bootstrap = await bootstrapViaAssetsPallet({
    wssUrl,
    dryRun,
    assetIdHint,
    assetHubSuri: process.env.ASSET_HUB_SURI,
    assetAdminAddress: process.env.ASSET_ADMIN_ADDRESS,
    deployerRecipient: process.env.ASSET_DEPLOYER_ADDRESS,
    counterfactualRecipient,
    userRecipient,
    assetName: process.env.ASSET_NAME,
    assetSymbol: process.env.ASSET_SYMBOL,
    assetDecimals: process.env.ASSET_DECIMALS ? Number(process.env.ASSET_DECIMALS) : undefined,
    mintAmount: process.env.ASSET_MINT_AMOUNT ? BigInt(process.env.ASSET_MINT_AMOUNT) : undefined
  });

  const precompileAddress = assetIdToPrecompileAddress(bootstrap.assetId);

  const output = {
    mode: dryRun ? "dry-run" : "live",
    assetId: bootstrap.assetId,
    precompileAddress,
    txHashes: bootstrap.txHashes,
    registryTxHash: null as string | null
  };

  console.log("DotFuel Assets Bootstrap Result");
  console.log(JSON.stringify(output, null, 2));

  const shouldRegister = Boolean(
    process.env.RPC_URL_TESTNET && process.env.TOKEN_REGISTRY_ADDRESS && process.env.PRIVATE_KEY
  );

  if (!shouldRegister) {
    console.log("Skipped TokenRegistry.setToken (missing RPC_URL_TESTNET/TOKEN_REGISTRY_ADDRESS/PRIVATE_KEY).");
    return;
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const rpcUrl = process.env.RPC_URL_TESTNET as string;

  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: undefined, transport: http(rpcUrl) });

  const txHash = await (walletClient as any).writeContract({
    address: getAddress(process.env.TOKEN_REGISTRY_ADDRESS as `0x${string}`),
    abi: tokenRegistryAbi,
    functionName: "setToken",
    args: [
      precompileAddress,
      {
        enabled: true,
        decimals: 6,
        markupBps: 300,
        minMaxCharge: 1n,
        maxMaxCharge: 1_000_000_000_000_000_000_000n
      }
    ]
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  output.registryTxHash = txHash;
  console.log(`TokenRegistry setToken tx: ${txHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
