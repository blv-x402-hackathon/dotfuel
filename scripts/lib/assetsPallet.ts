import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { getAddress, isAddress } from "viem";

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
  assetHubSuri?: string;
  assetAdminAddress?: string;
  deployerRecipient?: string;
  counterfactualRecipient?: string;
  userRecipient?: string;
  assetName?: string;
  assetSymbol?: string;
  assetDecimals?: number;
  mintAmount?: bigint;
}

interface MintPlan {
  deployerRecipient: string;
  counterfactualRecipient: string;
  userRecipient: string;
}

interface SubmittableExtrinsicLike {
  hash: { toHex(): string };
  signAndSend(
    signer: unknown,
    callback: (result: {
      dispatchError?: unknown;
      events: Array<{ event: { data: unknown[] } }>;
      status: { isFinalized: boolean };
      txHash?: { toHex(): string };
    }) => void
  ): Promise<() => void>;
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

  if (!params.assetHubSuri) {
    throw new Error("ASSET_HUB_SURI is required for live Assets pallet bootstrap");
  }

  const api = await ApiPromise.create({ provider: new WsProvider(params.wssUrl) });

  try {
    await cryptoWaitReady();

    const keyring = new Keyring({ type: "sr25519" });
    const signer = keyring.addFromUri(params.assetHubSuri);
    const mintPlan = resolveMintPlan(params, signer.address);
    const assetId = await resolveAssetId(api, params.assetIdHint);
    const adminAddress = params.assetAdminAddress ?? signer.address;
    const assetName = params.assetName ?? "Test USDT";
    const assetSymbol = params.assetSymbol ?? "tUSDT";
    const assetDecimals = params.assetDecimals ?? 6;
    const mintAmount = params.mintAmount ?? 1_000_000_000n;
    const minBalance = 1n;

    const createAssetTx = await submitExtrinsic(
      api,
      signer,
      api.tx.assets.create(assetId, adminAddress, minBalance)
    );
    const setMetadataTx = await submitExtrinsic(
      api,
      signer,
      api.tx.assets.setMetadata(assetId, assetName, assetSymbol, assetDecimals)
    );
    const mintToDeployerTx = await submitExtrinsic(
      api,
      signer,
      api.tx.assets.mint(assetId, mintPlan.deployerRecipient, mintAmount)
    );
    const mintToAccountTx = await submitExtrinsic(
      api,
      signer,
      api.tx.assets.mint(assetId, mintPlan.counterfactualRecipient, mintAmount)
    );
    const mintToUserTx = await submitExtrinsic(
      api,
      signer,
      api.tx.assets.mint(assetId, mintPlan.userRecipient, mintAmount)
    );

    return {
      assetId,
      txHashes: {
        createAssetTx,
        setMetadataTx,
        mintToDeployerTx,
        mintToAccountTx,
        mintToUserTx
      }
    };
  } finally {
    await api.disconnect();
  }
}

async function resolveAssetId(api: ApiPromise, assetIdHint: number): Promise<number> {
  const nextAssetIdQuery = (api.query.assets as Record<string, unknown>).nextAssetId;
  if (typeof nextAssetIdQuery === "function") {
    const nextAssetId = await (nextAssetIdQuery as () => Promise<{ toPrimitive(): unknown }> )();
    const primitive = nextAssetId.toPrimitive();
    if (typeof primitive === "number") {
      return primitive;
    }
    if (typeof primitive === "string") {
      return Number(primitive);
    }
  }

  let candidate = assetIdHint;
  while (true) {
    const asset = (await api.query.assets.asset(candidate)) as { isNone?: boolean };
    if (asset.isNone) {
      return candidate;
    }
    candidate += 1;
  }
}

function resolveMintPlan(params: AssetsBootstrapParams, signerAddress: string): MintPlan {
  return {
    deployerRecipient: normalizeRecipient(params.deployerRecipient ?? signerAddress),
    counterfactualRecipient: normalizeRecipient(
      params.counterfactualRecipient ?? params.deployerRecipient ?? signerAddress
    ),
    userRecipient: normalizeRecipient(params.userRecipient ?? params.deployerRecipient ?? signerAddress)
  };
}

function normalizeRecipient(recipient: string): string {
  if (!recipient.startsWith("0x")) {
    return recipient;
  }

  if (recipient.length === 66) {
    return recipient;
  }

  if (!isAddress(recipient)) {
    throw new Error(`Unsupported recipient format: ${recipient}`);
  }

  const normalized = getAddress(recipient);
  return `0x${normalized.slice(2)}${"ee".repeat(12)}`;
}

async function submitExtrinsic(api: ApiPromise, signer: unknown, tx: SubmittableExtrinsicLike): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      if (unsubscribe) {
        unsubscribe();
      }
      callback();
    };

    tx.signAndSend(signer, (result) => {
      const dispatchError = result.dispatchError;
      if (dispatchError) {
        finish(() => reject(new Error(formatDispatchError(api, dispatchError))));
        return;
      }

      const failed = result.events.find(({ event }) => api.events.system.ExtrinsicFailed.is(event as any));
      if (failed) {
        finish(() => reject(new Error(formatDispatchError(api, failed.event.data[0]))));
        return;
      }

      if (result.status.isFinalized) {
        const txHash = "txHash" in result && result.txHash ? result.txHash.toHex() : tx.hash.toHex();
        finish(() => resolve(txHash));
      }
    })
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch((error) => {
        finish(() => reject(error instanceof Error ? error : new Error(String(error))));
      });
  });
}

function formatDispatchError(api: ApiPromise, dispatchError: any): string {
  if (!dispatchError?.isModule) {
    return dispatchError.toString();
  }

  const decoded = api.registry.findMetaError(dispatchError.asModule);
  return `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
}
