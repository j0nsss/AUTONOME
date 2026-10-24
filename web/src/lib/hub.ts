"use client";

import { useEffect, useRef, useState } from "react";
import { createPublicClient, http, zeroAddress, type Address, type Hex } from "viem";
import { monadTestnet } from "./shared/chain";
import { a2aHubAbi, TASK_STATUS, type TaskStatusName } from "./shared/abi";

export const HUB = (process.env.NEXT_PUBLIC_HUB_ADDRESS ?? "0x") as Address;
const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz";

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC),
  pollingInterval: 1000,
});

const MAX_RANGE = 99n; // keep getLogs ranges small (public RPC limit)
const BACKFILL = 300n; // ≈ 2 minutes of history for the terminal on page load
const FEED_CAP = 300;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Public RPC occasionally answers 429; retry a few times with a short backoff. */
async function retry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await sleep(350 * (i + 1));
    }
  }
  throw last;
}

// ───────────────────────── types ─────────────────────────
export type HubEventName =
  | "AgentRegistered" | "TaskCreated" | "TaskClaimed"
  | "TaskCompleted" | "PaymentReleased" | "TaskRefunded";

export interface TaskView {
  id: number;
  requester: Address;
  worker?: Address;
  reward: bigint;
  deadline: number;
  status: TaskStatusName;
  prompt: string;
  result?: string;
  createdBlock?: bigint;
  createTx?: Hex;
  claimTx?: Hex;
  completeTx?: Hex;
}

export interface AgentView {
  address: Address;
  name: string;
  role: string;
  tasksPosted: number;
  tasksCompleted: number;
  totalEarned: bigint;
  totalSpent: bigint;
}

export interface FeedLine {
  key: string;
  kind: HubEventName;
  block: bigint;
  tx: Hex;
  seenAt: number;        // Date.now() when this client first saw it
  taskId?: number;
  actor?: Address;       // who did it (requester / worker / agent)
  other?: Address;       // counterparty when known
  amount?: bigint;
  note?: string;         // prompt / result / "name (role)"
}

export interface HubState {
  ready: boolean;
  error?: string;
  head: bigint;
  tasks: Record<number, TaskView>;
  feed: FeedLine[];
  lifecycleBlocks: number[]; // blocks from TaskCreated → PaymentReleased (recent)
}

const EMPTY: HubState = { ready: false, head: 0n, tasks: {}, feed: [], lifecycleBlocks: [] };

// ───────────────────────── chain reads ─────────────────────────
async function fetchLogs(fromBlock: bigint, toBlock: bigint) {
  return publicClient.getContractEvents({
    abi: a2aHubAbi, address: HUB, fromBlock, toBlock, strict: true,
  });
}
type HubLog = Awaited<ReturnType<typeof fetchLogs>>[number];

async function hydrateTasks(): Promise<Record<number, TaskView>> {
  const count = await retry(() =>
    publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "taskCount" }),
  );
  const ids: bigint[] = [];
  for (let i = count; i >= 1n && ids.length < 10; i--) ids.push(i);

  const out: Record<number, TaskView> = {};
  for (let i = 0; i < ids.length; i += 3) {
    const chunk = ids.slice(i, i + 3);
    const rows = await Promise.all(
      chunk.map((id) =>
        retry(() =>
          publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "tasks", args: [id] }),
        ).catch(() => null),
      ),
    );
    for (const r of rows) {
      if (!r) continue;
      const [id, requester, worker, reward, , deadline, status, prompt, result] = r;
      out[Number(id)] = {
        id: Number(id), requester, reward, deadline: Number(deadline),
        worker: worker === zeroAddress ? undefined : worker,
        status: TASK_STATUS[status] ?? "Open",
        prompt, result: result || undefined,
      };
    }
  }
  return out;
}

// ───────────────────────── reducer ─────────────────────────
function reduceLog(s: HubState, log: HubLog): HubState {
  const base = { key: `${log.transactionHash}:${log.logIndex}`, block: log.blockNumber, tx: log.transactionHash, seenAt: Date.now() };
  const tasks = { ...s.tasks };
  const lifecycle = [...s.lifecycleBlocks];
  let line: FeedLine;

  switch (log.eventName) {
    case "AgentRegistered": {
      line = { ...base, kind: "AgentRegistered", actor: log.args.agent, note: `${log.args.name} (${log.args.role})` };
      break;
    }
    case "TaskCreated": {
      const a = log.args;
      const id = Number(a.taskId);
      tasks[id] = {
        id, requester: a.requester, reward: a.reward, deadline: Number(a.deadline),
        status: "Open", prompt: a.prompt, createdBlock: log.blockNumber, createTx: log.transactionHash,
      };
      line = { ...base, kind: "TaskCreated", taskId: id, actor: a.requester, amount: a.reward, note: a.prompt };
      break;
    }
    case "TaskClaimed": {
      const id = Number(log.args.taskId);
      const t = tasks[id];
      if (t) tasks[id] = { ...t, worker: log.args.worker, status: "Claimed", claimTx: log.transactionHash };
      line = { ...base, kind: "TaskClaimed", taskId: id, actor: log.args.worker, other: t?.requester };
      break;
    }
    case "TaskCompleted": {
      const id = Number(log.args.taskId);
      const t = tasks[id];
      if (t) tasks[id] = { ...t, status: "Completed", result: log.args.result, completeTx: log.transactionHash };
      line = { ...base, kind: "TaskCompleted", taskId: id, actor: log.args.worker, other: t?.requester, note: log.args.result };
      break;
    }
    case "PaymentReleased": {
      const id = Number(log.args.taskId);
      const t = tasks[id];
      if (t?.createdBlock !== undefined) lifecycle.push(Number(log.blockNumber - t.createdBlock));
      line = { ...base, kind: "PaymentReleased", taskId: id, actor: log.args.worker, other: t?.requester, amount: log.args.amount };
      break;
    }
    case "TaskRefunded": {
      const id = Number(log.args.taskId);
      const t = tasks[id];
      if (t) tasks[id] = { ...t, status: "Refunded" };
      line = { ...base, kind: "TaskRefunded", taskId: id, actor: log.args.requester, amount: log.args.amount };
      break;
    }
  }
  return { ...s, tasks, feed: [...s.feed, line].slice(-FEED_CAP), lifecycleBlocks: lifecycle.slice(-50) };
}

// ───────────────────────── hooks ─────────────────────────
/** Live feed + task map. Hydrates recent tasks, back-fills ~300 blocks of events, then polls forever. */
export function useHubFeed(): HubState {
  const [state, setState] = useState<HubState>(EMPTY);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let stop = false;

    const push = (logs: HubLog[]) => {
      const fresh = logs.filter((l) => {
        const k = `${l.transactionHash}:${l.logIndex}`;
        if (seen.current.has(k)) return false;
        seen.current.add(k);
        return true;
      });
      if (fresh.length && !stop) setState((s) => fresh.reduce((acc, l) => reduceLog(acc, l), s));
    };

    (async () => {
      const message = (e: unknown) => String((e as Error).message ?? e).split("\n")[0];

      let headStart: bigint | undefined;
      while (!stop && headStart === undefined) {
        try {
          headStart = await retry(() => publicClient.getBlockNumber({ cacheTime: 0 }));
        } catch (e) {
          if (!stop) setState((s) => ({ ...s, error: message(e) }));
          await sleep(1200);
        }
      }
      if (stop || headStart === undefined) return;

      let cursor = headStart > BACKFILL ? headStart - BACKFILL : 0n;
      const tasks = await hydrateTasks().catch(() => ({} as Record<number, TaskView>));
      if (stop) return;
      setState((s) => ({ ...s, ready: true, head: headStart!, tasks, error: undefined }));

      while (!stop) {
        try {
          const head = await retry(() => publicClient.getBlockNumber({ cacheTime: 0 }));
          while (cursor <= head && !stop) {
            const to = cursor + MAX_RANGE < head ? cursor + MAX_RANGE : head;
            push(await retry(() => fetchLogs(cursor, to)));
            cursor = to + 1n;
          }
          if (!stop) setState((s) => (s.head === head ? s : { ...s, head, error: undefined }));
        } catch (e) {
          console.error("[useHubFeed]", e); // keep polling; transient RPC errors are expected
        }
        await sleep(1000);
      }
    })();

    return () => { stop = true; };
  }, []);

  return state;
}

/** Agent profiles + global task count, refreshed every 3 s (also the source for global stats). */
export function useAgents(): { agents: AgentView[]; taskCount: number } {
  const [data, setData] = useState<{ agents: AgentView[]; taskCount: number }>({ agents: [], taskCount: 0 });

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const [list, count] = await Promise.all([
          publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "getAgents" }),
          publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "taskCount" }),
        ]);
        const rows = await Promise.all(
          list.map((a) => publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "agents", args: [a] })),
        );
        if (stop) return;
        setData({
          taskCount: Number(count),
          agents: rows.map((r, i) => ({
            address: list[i], name: r[0], role: r[1],
            tasksPosted: Number(r[2]), tasksCompleted: Number(r[3]), totalEarned: r[4], totalSpent: r[5],
          })),
        });
      } catch (e) {
        console.error("[useAgents]", e);
      }
    };
    void tick();
    const id = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  return data;
}
