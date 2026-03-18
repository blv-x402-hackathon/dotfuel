import express from "express";

import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { campaignRouter } from "./routes/campaign";
import { healthRouter } from "./routes/health";
import { quoteRouter } from "./routes/quote";

const app = express();

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(healthRouter);
app.use(quoteRouter);
app.use(campaignRouter);
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`paymaster-api listening on :${config.PORT}`);
});
