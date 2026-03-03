export interface BootstrapTxHashes {
  createAssetTx: string;
  setMetadataTx: string;
  mintToDeployerTx: string;
  mintToAccountTx: string;
  mintToUserTx: string;
}

export interface BootstrapResult {
  assetId: number;
  txHashes: BootstrapTxHashes;
}

export interface AssetsBootstrapParams {
  wssUrl: string;
  dryRun: boolean;
  assetIdHint: number;
}

function fakeTxHash(seed: string): string {
  const normalized = seed.padEnd(64, "0").slice(0, 64);
  return `0x${normalized}`;
}

export async function bootstrapViaAssetsPallet(params: AssetsBootstrapParams): Promise<BootstrapResult> {
  if (params.dryRun) {
    return {
      assetId: params.assetIdHint,
      txHashes: {
        createAssetTx: fakeTxHash("createasset"),
        setMetadataTx: fakeTxHash("setmetadata"),
        mintToDeployerTx: fakeTxHash("mintdeployer"),
        mintToAccountTx: fakeTxHash("mintaccount"),
        mintToUserTx: fakeTxHash("mintuser")
      }
    };
  }

  throw new Error(
    `Live Assets pallet bootstrap is not wired yet. Re-run with DRY_RUN=true (WSS: ${params.wssUrl}).`
  );
}
