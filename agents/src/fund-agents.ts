import { parseEther, formatEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "./clients";
import { makeAgentWallet } from "./tx";
import { hexEnv } from "./env";

const deployer = makeAgentWallet(hexEnv("DEPLOYER_PRIVATE_KEY"));
const targets: [string, string][] = [
  ["REQUESTER_PRIVATE_KEY", "1"],
  ["WORKER_1_PRIVATE_KEY", "0.3"],
  ["WORKER_2_PRIVATE_KEY", "0.3"],
];

const bal = await publicClient.getBalance({ address: deployer.account.address });
console.log(`deployer ${deployer.account.address} has ${formatEther(bal)} MON`);

for (const [envKey, amt] of targets) {
  const pk = process.env[envKey];
  if (!pk) continue;
  const to = privateKeyToAccount(pk as Hex).address;
  const hash = await deployer.walletClient.sendTransaction({ to, value: parseEther(amt) });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✔ sent ${amt} MON → ${envKey} (${to})`);
}
