import { formatEther, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "./clients";
import { a2aHubAbi } from "./shared/abi";
import { env } from "./env";
import { runTask } from "./llm";

let failed = false;
const ok = (m: string) => console.log("\x1b[32m✔\x1b[0m", m);
const warn = (m: string) => console.log("\x1b[33m!\x1b[0m", m);
const bad = (m: string) => { console.log("\x1b[31m✘\x1b[0m", m); failed = true; };

try {
  const chainId = await publicClient.getChainId();
  chainId === 10143 ? ok(`RPC chainId ${chainId} (Monad Testnet)`) : bad(`wrong chainId ${chainId} (expected 10143)`);
  const head = await publicClient.getBlockNumber();
  ok(`head block ${head}`);

  const code = await publicClient.getCode({ address: env.hub });
  code && code !== "0x" ? ok(`A2AHub has bytecode at ${env.hub}`) : bad(`no contract at HUB_ADDRESS ${env.hub}`);
  const n = await publicClient.readContract({ address: env.hub, abi: a2aHubAbi, functionName: "taskCount" });
  ok(`taskCount() = ${n}`);

  const wallets: [string, string, bigint][] = [
    ["DEPLOYER_PRIVATE_KEY", "deployer", parseEther("0.05")],
    ["REQUESTER_PRIVATE_KEY", "requester", parseEther("0.5")],
    ["WORKER_1_PRIVATE_KEY", "worker 1", parseEther("0.1")],
    ["WORKER_2_PRIVATE_KEY", "worker 2", parseEther("0.1")],
  ];
  for (const [k, label, min] of wallets) {
    const pk = process.env[k];
    if (!pk) { bad(`${k} missing`); continue; }
    const addr = privateKeyToAccount(pk as Hex).address;
    const b = await publicClient.getBalance({ address: addr });
    b >= min ? ok(`${label} ${addr} · ${formatEther(b)} MON`) : bad(`${label} ${addr} low: ${formatEther(b)} MON (< ${formatEther(min)})`);
  }

  if (env.mockLlm) warn("MOCK_LLM=true — answers will be canned");
  else if (!process.env.OPENAI_API_KEY) warn("OPENAI_API_KEY missing — will fall back to mock answers");
  const t0 = Date.now();
  const r = await runTask("SENTIMENT", "I love this hackathon");
  ok(`LLM ping ${Date.now() - t0}ms${r.mocked ? " (mock)" : ""} → ${r.text}`);
} catch (e) {
  bad(`preflight crashed: ${(e as Error).message.split("\n")[0]}`);
}
console.log(failed ? "\n\x1b[31mPREFLIGHT FAILED\x1b[0m" : "\n\x1b[32mALL GREEN — ready to demo\x1b[0m");
process.exit(failed ? 1 : 0);
