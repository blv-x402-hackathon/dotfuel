import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { z } from "zod";

import { buildSponsorQuote } from "../services/sponsorQuoteBuilder";
import { buildTokenQuote } from "../services/quoteBuilder";

const tokenQuoteSchema = z.object({
  chainId: z.number().int().positive(),
  sender: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  callData: z.string().regex(/^0x[a-fA-F0-9]*$/),
  initCode: z.string().regex(/^0x[a-fA-F0-9]*$/),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  maxFeePerGas: z.string().regex(/^0x[a-fA-F0-9]+$/),
  maxPriorityFeePerGas: z.string().regex(/^0x[a-fA-F0-9]+$/)
});

const sponsorQuoteSchema = z.object({
  chainId: z.number().int().positive(),
  sender: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  callData: z.string().regex(/^0x[a-fA-F0-9]*$/),
  initCode: z.string().regex(/^0x[a-fA-F0-9]*$/),
  campaignId: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

const router: Router = createRouter();

router.post("/v1/quote/token", async (req: Request, res: Response) => {
  const parsed = tokenQuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const quote = await buildTokenQuote(parsed.data);
    res.status(200).json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to build token quote";
    res.status(400).json({ error: message });
  }
});

router.post("/v1/quote/sponsor", async (req: Request, res: Response) => {
  const parsed = sponsorQuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const quote = await buildSponsorQuote(parsed.data);
    res.status(200).json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to build sponsor quote";
    res.status(400).json({ error: message });
  }
});

export { router as quoteRouter };
