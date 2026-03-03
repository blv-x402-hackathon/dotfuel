import { getAddress, parseAbi, toHex } from "viem";
import type { Hex } from "viem";

import { adminClient, publicClient } from "../client";
import { config } from "../config";

const campaignRegistryAbi = parseAbi([
  "function createCampaign(bytes32 campaignId, (bool enabled,uint48 start,uint48 end,uint256 budget,uint256 spent,address[] allowedTargets,uint32 perUserMaxOps) cfg)",
  "function fundCampaign(bytes32 campaignId) payable",
  "function setAllowedTargets(bytes32 campaignId, address[] allowedTargets)",
  "function getCampaign(bytes32 campaignId) view returns ((bool enabled,uint48 start,uint48 end,uint256 budget,uint256 spent,address[] allowedTargets,uint32 perUserMaxOps))",
  "function userOpsUsed(bytes32 campaignId, address user) view returns (uint32)"
]);

export interface CreateCampaignInput {
  campaignId: Hex;
  start: number;
  end: number;
  budget: bigint;
  allowedTargets: `0x${string}`[];
  perUserMaxOps: number;
}

function requireAdmin() {
  if (!adminClient || !adminClient.account) {
    const err = new Error("admin key not configured");
    (err as any).status = 401;
    throw err;
  }
  return adminClient;
}

export async function createCampaign(input: CreateCampaignInput) {
  const client = requireAdmin();

  const hash = await client.writeContract({
    address: getAddress(config.CAMPAIGN_REGISTRY_ADDRESS),
    abi: campaignRegistryAbi,
    functionName: "createCampaign",
    args: [
      input.campaignId,
      {
        enabled: true,
        start: input.start,
        end: input.end,
        budget: input.budget,
        spent: 0n,
        allowedTargets: input.allowedTargets,
        perUserMaxOps: input.perUserMaxOps
      }
    ]
  });

  return hash;
}

export async function fundCampaign(campaignId: Hex, amount: bigint) {
  const client = requireAdmin();

  const hash = await client.writeContract({
    address: getAddress(config.CAMPAIGN_REGISTRY_ADDRESS),
    abi: campaignRegistryAbi,
    functionName: "fundCampaign",
    args: [campaignId],
    value: amount
  });

  return hash;
}

export async function updateAllowlist(campaignId: Hex, allowedTargets: `0x${string}`[]) {
  const client = requireAdmin();

  const hash = await client.writeContract({
    address: getAddress(config.CAMPAIGN_REGISTRY_ADDRESS),
    abi: campaignRegistryAbi,
    functionName: "setAllowedTargets",
    args: [campaignId, allowedTargets]
  });

  return hash;
}

export async function getCampaignStatus(campaignId: Hex, user?: `0x${string}`) {
  const campaign = await publicClient.readContract({
    address: getAddress(config.CAMPAIGN_REGISTRY_ADDRESS),
    abi: campaignRegistryAbi,
    functionName: "getCampaign",
    args: [campaignId]
  });

  const remainingBudget = campaign.budget > campaign.spent ? campaign.budget - campaign.spent : 0n;

  let userOpsUsed: number | undefined;
  if (user) {
    userOpsUsed = Number(
      await publicClient.readContract({
        address: getAddress(config.CAMPAIGN_REGISTRY_ADDRESS),
        abi: campaignRegistryAbi,
        functionName: "userOpsUsed",
        args: [campaignId, user]
      })
    );
  }

  return {
    enabled: campaign.enabled,
    budget: toHex(campaign.budget),
    spent: toHex(campaign.spent),
    remainingBudget: toHex(remainingBudget),
    perUserMaxOps: campaign.perUserMaxOps,
    userOpsUsed
  };
}
