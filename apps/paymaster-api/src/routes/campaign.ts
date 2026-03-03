import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { hexToBigInt } from "viem";
import { z } from "zod";

import {
  createCampaign,
  fundCampaign,
  getCampaignStatus,
  updateAllowlist
} from "../services/campaignService";

const createSchema = z.object({
  campaignId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  budget: z.string().regex(/^0x[a-fA-F0-9]+$/),
  allowedTargets: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).min(1),
  perUserMaxOps: z.number().int().positive()
});

const fundSchema = z.object({
  campaignId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  amount: z.string().regex(/^0x[a-fA-F0-9]+$/)
});

const allowlistSchema = z.object({
  campaignId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  allowedTargets: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/))
});

const router: Router = createRouter();

router.post("/v1/campaign/create", async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const hash = await createCampaign({
      campaignId: parsed.data.campaignId as `0x${string}`,
      start: parsed.data.start,
      end: parsed.data.end,
      budget: hexToBigInt(parsed.data.budget as `0x${string}`),
      allowedTargets: parsed.data.allowedTargets as `0x${string}`[],
      perUserMaxOps: parsed.data.perUserMaxOps
    });

    res.status(200).json({ txHash: hash });
  } catch (error) {
    const status = (error as any)?.status ?? 500;
    const message = error instanceof Error ? error.message : "failed to create campaign";
    res.status(status).json({ error: message });
  }
});

router.post("/v1/campaign/fund", async (req: Request, res: Response) => {
  const parsed = fundSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const hash = await fundCampaign(
      parsed.data.campaignId as `0x${string}`,
      hexToBigInt(parsed.data.amount as `0x${string}`)
    );
    res.status(200).json({ txHash: hash });
  } catch (error) {
    const status = (error as any)?.status ?? 500;
    const message = error instanceof Error ? error.message : "failed to fund campaign";
    res.status(status).json({ error: message });
  }
});

router.post("/v1/campaign/allowlist", async (req: Request, res: Response) => {
  const parsed = allowlistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const hash = await updateAllowlist(
      parsed.data.campaignId as `0x${string}`,
      parsed.data.allowedTargets as `0x${string}`[]
    );
    res.status(200).json({ txHash: hash });
  } catch (error) {
    const status = (error as any)?.status ?? 500;
    const message = error instanceof Error ? error.message : "failed to update allowlist";
    res.status(status).json({ error: message });
  }
});

router.get("/v1/campaign/:id/status", async (req: Request, res: Response) => {
  const campaignId = req.params.id;
  if (!/^0x[a-fA-F0-9]{64}$/.test(campaignId)) {
    res.status(400).json({ error: "invalid campaignId" });
    return;
  }

  const user = req.query.user;
  if (typeof user !== "undefined" && !/^0x[a-fA-F0-9]{40}$/.test(String(user))) {
    res.status(400).json({ error: "invalid user" });
    return;
  }

  try {
    const status = await getCampaignStatus(
      campaignId as `0x${string}`,
      typeof user === "string" ? (user as `0x${string}`) : undefined
    );
    res.status(200).json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch campaign status";
    res.status(500).json({ error: message });
  }
});

export { router as campaignRouter };
