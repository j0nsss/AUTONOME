import { publicClient } from "./clients";
import { a2aHubAbi } from "./shared/abi";
import { env } from "./env";
import { sleep } from "./util";

const MAX_RANGE = 99n; // public RPC getLogs range limit is small (~100 blocks)

async function fetchEvents(fromBlock: bigint, toBlock: bigint) {
  return publicClient.getContractEvents({
    abi: a2aHubAbi,
    address: env.hub,
    fromBlock,
    toBlock,
    strict: true, // typed, fully-populated args; undecodable logs are dropped
  });
}
export type HubEvent = Awaited<ReturnType<typeof fetchEvents>>[number];

/**
 * Bounded polling loop over A2AHub events. Starts at the current head (or `startBlock`),
 * never rescans a block, never requests >99 blocks per call.
 * `onEvent` is fire-and-forget so slow handlers (LLM calls) never block event ingestion.
 */
export async function pollHubEvents(
  onEvent: (e: HubEvent) => void | Promise<void>,
  opts: { startBlock?: bigint; intervalMs?: number } = {},
): Promise<never> {
  let cursor = opts.startBlock ?? (await publicClient.getBlockNumber({ cacheTime: 0 }));
  const interval = opts.intervalMs ?? env.pollMs;

  for (;;) {
    try {
      const head = await publicClient.getBlockNumber({ cacheTime: 0 });
      while (cursor <= head) {
        const to = cursor + MAX_RANGE < head ? cursor + MAX_RANGE : head;
        const logs = await fetchEvents(cursor, to);
        for (const log of logs) {
          void Promise.resolve(onEvent(log)).catch((err) => console.error("[poller] handler error:", err));
        }
        cursor = to + 1n;
      }
    } catch (err) {
      console.error("[poller] error (will retry):", (err as Error).message?.split("\n")[0]);
    }
    await sleep(interval);
  }
}
