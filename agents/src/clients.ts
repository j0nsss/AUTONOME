import { createPublicClient, http } from "viem";
import { monadTestnet } from "./shared/chain";
import { env } from "./env";

/** pollingInterval 500ms: Monad blocks are ~400ms; viem's 4000ms default would make everything feel slow. */
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(env.rpcUrl, { retryCount: 4, retryDelay: 500, timeout: 20_000 }),
  pollingInterval: 500,
});
