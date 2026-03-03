import express from "express";

import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { healthRouter } from "./routes/health";

const app = express();

app.use(express.json());
app.use(healthRouter);
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`paymaster-api listening on :${config.PORT}`);
});
