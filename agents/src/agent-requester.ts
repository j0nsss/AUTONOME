import { formatEther, parseEther } from "viem";
import { env, hexEnv } from "./env";
import { publicClient } from "./clients";
import { makeAgentWallet } from "./tx";
import { makeLogger, COLORS } from "./logger";
import { a2aHubAbi } from "./shared/abi";
import { txUrl } from "./shared/chain";
import { pollHubEvents } from "./poller";
import { CATALOG, encodePrompt } from "./task-protocol";
import { sleep, short, mon, clip, shortErr } from "./util";

const NAME = process.env.REQUESTER_NAME ?? "Atlas";
const log = makeLogger(NAME.toUpperCase(), COLORS.cyan);
const mode = (process.argv[2] ?? "loop") as "loop" | "burst" | "once";
const count = Number(process.argv[3] ?? "5");
const GAS_RESERVE = parseEther("0.05");

type Mine = { deadline: bigint; settled: boolean; reward: bigint };
const mine = new Map<bigint, Mine>();
let paidTotal = 0n;
let postedCount = 0;
let cursor = 0; // rotates through CATALOG

async function main() {
  const { account, sendAndWait } = makeAgentWallet(hexEnv("REQUESTER_PRIVATE_KEY"));
  const me = account.address.toLowerCase();

  const bal = await publicClient.getBalance({ address: account.address });
  log.info(`online as ${account.address} · balance ${formatEther(bal)} MON · mode=${mode}`);
  if (bal < parseEther("0.1")) log.warn("low balance — fund via https://faucet.monad.xyz or `npm run fund`");

  // 1) register identity (idempotent)
  const profile = await publicClient.readContract({
    address: env.hub, abi: a2aHubAbi, functionName: "agents", args: [account.address],
  });
  if (profile[0] === "") {
    const { hash } = await sendAndWait("registerAgent", [NAME, "requester"]);
    log.ok(`registered as "${NAME}" · ${txUrl(hash)}`);
  }

  // 2) watch events for my tasks
  void pollHubEvents((e) => {
    switch (e.eventName) {
      case "TaskCreated":
        if (e.args.requester.toLowerCase() === me)
          mine.set(e.args.taskId, { deadline: e.args.deadline, settled: false, reward: e.args.reward });
        break;
      case "TaskClaimed":
        if (mine.has(e.args.taskId)) log.info(`task #${e.args.taskId} claimed by ${short(e.args.worker)}`);
        break;
      case "TaskCompleted":
        if (mine.has(e.args.taskId)) log.ok(`task #${e.args.taskId} result ← "${clip(e.args.result)}"`);
        break;
      case "PaymentReleased": {
        const m = mine.get(e.args.taskId);
        if (m && !m.settled) {
          m.settled = true;
          paidTotal += e.args.amount;
          log.ok(`paid ${mon(e.args.amount)} → ${short(e.args.worker)} · task #${e.args.taskId} · ${txUrl(e.transactionHash)}`);
        }
        break;
      }
      case "TaskRefunded": {
        const m = mine.get(e.args.taskId);
        if (m) { m.settled = true; log.warn(`task #${e.args.taskId} refunded (${mon(e.args.amount)})`); }
        break;
      }
    }
  });

  // 3) refund watchdog
  setInterval(async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    for (const [id, m] of mine) {
      if (m.settled || now <= m.deadline + 2n) continue;
      m.settled = true; // optimistic; avoid duplicate attempts
      try {
        const { hash } = await sendAndWait("refundExpired", [id]);
        log.warn(`refunded expired task #${id} · ${txUrl(hash)}`);
      } catch (e) {
        log.info(`refund #${id} skipped: ${shortErr(e)}`);
      }
    }
  }, 5000);

  // 4) posting
  async function postTask(): Promise<void> {
    const spec = CATALOG[cursor++ % CATALOG.length];
    const reward = parseEther(spec.rewardMon);
    log.info(`posting ${spec.type} · locking ${spec.rewardMon} MON…`);
    try {
      const { hash } = await sendAndWait("createTask", [encodePrompt(spec.type, spec.payload), env.ttl], reward);
      postedCount++;
      log.ok(`task posted (${spec.type}) · ${txUrl(hash)}`);
    } catch (e) {
      log.error(`post failed: ${shortErr(e)}`);
    }
  }

  const allSettled = () => postedCount > 0 && mine.size >= postedCount && [...mine.values()].every((m) => m.settled);
  async function waitSettled(maxMs: number) {
    const t0 = Date.now();
    while (!allSettled() && Date.now() - t0 < maxMs) await sleep(500);
  }
  const summary = () =>
    log.ok(`SUMMARY · posted=${postedCount} settled=${[...mine.values()].filter((m) => m.settled).length} paid=${mon(paidTotal)}`);

  if (mode === "once") {
    await postTask();
    await waitSettled(90_000);
    summary();
    process.exit(0);
  } else if (mode === "burst") {
    log.info(`BURST: firing ${count} tasks concurrently…`);
    await Promise.all(Array.from({ length: count }, () => postTask()));
    await waitSettled(120_000);
    summary();
    process.exit(0);
  } else {
    for (;;) {
      const b = await publicClient.getBalance({ address: account.address });
      if (b < parseEther("0.01") + GAS_RESERVE) {
        log.warn("budget exhausted — pausing posts (fund me!)");
        await sleep(10_000);
        continue;
      }
      await postTask();
      await sleep(env.loopMs);
    }
  }
}

main().catch((e) => {
  log.error(`fatal: ${shortErr(e)}`);
  process.exit(1);
});
