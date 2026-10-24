import { formatEther, parseEther } from "viem";
import { env, hexEnv } from "./env";
import { publicClient } from "./clients";
import { makeAgentWallet } from "./tx";
import { makeLogger, COLORS } from "./logger";
import { a2aHubAbi } from "./shared/abi";
import { txUrl } from "./shared/chain";
import { pollHubEvents } from "./poller";
import { ALL_TYPES, parsePrompt, type TaskType } from "./task-protocol";
import { runTask } from "./llm";
import { sleep, mon, clip, shortErr } from "./util";

const id = process.argv[2] ?? "1";
const NAME = process.env[`WORKER_${id}_NAME`] ?? `Worker-${id}`;
const CAPS = (process.env[`WORKER_${id}_CAPS`] ?? ALL_TYPES.join(","))
  .split(",").map((s) => s.trim()).filter(Boolean) as TaskType[];
const log = makeLogger(NAME.toUpperCase(), id === "1" ? COLORS.green : COLORS.yellow);

const MAX_IN_FLIGHT = 1;
const MIN_REWARD = parseEther(env.minRewardMon);
const seen = new Set<string>();
let inFlight = 0;

async function main() {
  const { account, sendAndWait } = makeAgentWallet(hexEnv(`WORKER_${id}_PRIVATE_KEY`));
  const me = account.address.toLowerCase();

  const bal = await publicClient.getBalance({ address: account.address });
  log.info(`online as ${account.address} · balance ${formatEther(bal)} MON · caps=[${CAPS.join(",")}]`);
  if (bal < parseEther("0.02")) log.warn("low balance — need a little MON for gas (`npm run fund`)");

  const profile = await publicClient.readContract({
    address: env.hub, abi: a2aHubAbi, functionName: "agents", args: [account.address],
  });
  if (profile[0] === "") {
    const { hash } = await sendAndWait("registerAgent", [NAME, "worker"]);
    log.ok(`registered as "${NAME}" · ${txUrl(hash)}`);
  }

  async function handleTask(taskId: bigint, requester: string, prompt: string, reward: bigint, deadline: bigint) {
    const key = taskId.toString();
    if (seen.has(key)) return;
    seen.add(key);

    if (requester.toLowerCase() === me) return;
    const parsed = parsePrompt(prompt);
    if (!parsed) return log.warn(`#${taskId} unparseable prompt — skipping`);
    if (!CAPS.includes(parsed.type)) return log.info(`#${taskId} ${parsed.type} outside my capabilities — skipping`);
    if (reward < MIN_REWARD) return log.info(`#${taskId} reward ${mon(reward)} below my minimum — skipping`);
    const secsLeft = Number(deadline) - Math.floor(Date.now() / 1000);
    if (secsLeft < 20) return log.info(`#${taskId} expires in ${secsLeft}s — skipping`);

    while (inFlight >= MAX_IN_FLIGHT) await sleep(200);
    inFlight++;
    try {
      log.info(`#${taskId} ${parsed.type} · reward ${mon(reward)} · attempting claim…`);
      try {
        const { hash } = await sendAndWait("claimTask", [taskId]);
        log.ok(`claimed #${taskId} · ${txUrl(hash)}`);
      } catch (e) {
        return log.warn(`#${taskId} lost the race (${shortErr(e)})`);
      }

      log.info(`#${taskId} thinking… (LLM)`);
      const t0 = Date.now();
      const { text, mocked } = await runTask(parsed.type, parsed.payload);
      log.info(`#${taskId} answer in ${Date.now() - t0}ms${mocked ? " (mock)" : ""}: "${clip(text, 70)}"`);

      try {
        const { hash } = await sendAndWait("submitResultAndPayout", [taskId, text]);
        const nb = await publicClient.getBalance({ address: account.address });
        log.ok(`delivered #${taskId} · +${mon(reward)} · balance ${formatEther(nb)} MON · ${txUrl(hash)}`);
      } catch (e) {
        log.error(`#${taskId} submit failed: ${shortErr(e)}`);
      }
    } finally {
      inFlight--;
    }
  }

  // 1) live events (start BEFORE catch-up so nothing falls in the gap; `seen` dedupes)
  void pollHubEvents((e) => {
    if (e.eventName === "TaskCreated") {
      const a = e.args;
      return handleTask(a.taskId, a.requester, a.prompt, a.reward, a.deadline);
    }
  });

  // 2) catch-up: pick up still-open tasks created before we started
  try {
    const total = await publicClient.readContract({ address: env.hub, abi: a2aHubAbi, functionName: "taskCount" });
    const lowest = total > 15n ? total - 14n : 1n;
    for (let i = total; i >= lowest; i--) {
      const t = await publicClient.readContract({
        address: env.hub, abi: a2aHubAbi, functionName: "tasks", args: [i],
      });
      const [, requester, , reward, , deadline, status, prompt] = t;
      if (status === 0) void handleTask(i, requester, prompt, reward, deadline); // 0 = Open
    }
  } catch (e) {
    log.warn(`catch-up skipped: ${shortErr(e)}`);
  }

  log.info("listening for tasks…");
}

main().catch((e) => {
  log.error(`fatal: ${shortErr(e)}`);
  process.exit(1);
});
