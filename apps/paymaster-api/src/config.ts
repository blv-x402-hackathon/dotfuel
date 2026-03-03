import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  RPC_URL_TESTNET: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive(),
  PAYMASTER_ADDRESS: z.string(),
  PERMIT2_ADDRESS: z.string(),
  QUOTE_SIGNER_PRIVATE_KEY: z.string(),
  TOKEN_REGISTRY_ADDRESS: z.string(),
  CAMPAIGN_REGISTRY_ADDRESS: z.string(),
  ENTRYPOINT_ADDRESS: z.string(),
  TREASURY_ADDRESS: z.string(),
  PORT: z.coerce.number().int().positive().default(3001),
  QUOTE_TTL_SECONDS: z.coerce.number().int().positive().default(300)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
