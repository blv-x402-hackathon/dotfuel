import express from "express";

import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { campaignRouter } from "./routes/campaign";
import { healthRouter } from "./routes/health";
import { quoteRouter } from "./routes/quote";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(healthRouter);
app.use(quoteRouter);
app.use(campaignRouter);
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`paymaster-api listening on :${config.PORT}`);
});
