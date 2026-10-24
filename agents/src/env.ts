import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../.env") }); // repo-root .env

const opt = (k: string, d: string): string => {
  const v = process.env[k];
  return v && v.length > 0 ? v : d;
};

export const need = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env var: ${k} (see .env.example)`);
  return v;
};

export const hexEnv = (k: string): `0x${string}` => {
  const v = need(k);
  if (!/^0x[0-9a-fA-F]+$/.test(v) || v.length < 4) throw new Error(`${k} must be 0x-prefixed hex`);
  return v as `0x${string}`;
};

export const env = {
  rpcUrl: opt("MONAD_RPC_URL", "https://testnet-rpc.monad.xyz"),
  pollMs: Number(opt("POLL_INTERVAL_MS", "1000")),
  loopMs: Number(opt("LOOP_INTERVAL_MS", "6000")),
  ttl: BigInt(opt("TASK_TTL_SECONDS", "300")),
  mockLlm: opt("MOCK_LLM", "false") === "true",
  openaiModel: opt("OPENAI_MODEL", "gpt-4o-mini"),
  minRewardMon: opt("WORKER_MIN_REWARD_MON", "0.002"),
  get hub(): `0x${string}` {
    return hexEnv("HUB_ADDRESS");
  },
};
