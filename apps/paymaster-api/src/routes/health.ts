import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

import { publicClient } from "../client";
import { config } from "../config";

const router: Router = createRouter();

router.get("/healthz", async (_req: Request, res: Response) => {
  const blockNumber = await publicClient.getBlockNumber();

  res.status(200).json({
    status: "ok",
    chainId: config.CHAIN_ID,
    paymasterAddress: config.PAYMASTER_ADDRESS,
    blockNumber: blockNumber.toString()
  });
});

export { router as healthRouter };
