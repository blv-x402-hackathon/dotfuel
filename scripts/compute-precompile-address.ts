import { assetIdToPrecompileAddress } from "./lib/precompile";

function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: pnpm --filter scripts compute-precompile-address <assetId>");
    process.exit(1);
  }

  const assetId = Number(raw);
  if (!Number.isInteger(assetId) || assetId < 0) {
    console.error(`Invalid assetId: ${raw}. assetId must be a non-negative integer.`);
    process.exit(1);
  }

  const address = assetIdToPrecompileAddress(assetId);

  console.log(`Asset ID:           ${assetId} (0x${assetId.toString(16).toUpperCase()})`);
  console.log(`Precompile address: ${address}`);
}

main();
