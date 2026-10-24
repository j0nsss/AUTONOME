import { createWalletClient, http, type Abi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./shared/chain";
import { a2aHubAbi } from "./shared/abi";
import { publicClient } from "./clients";
import { env } from "./env";

const abi: Abi = a2aHubAbi; // widened so functionName/args can be dynamic strings

export type HubWriteName =
  | "registerAgent"
  | "createTask"
  | "claimTask"
  | "submitResultAndPayout"
  | "refundExpired";

export function makeAgentWallet(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(env.rpcUrl, { retryCount: 4, retryDelay: 250 }),
  });

  let nextNonce: number | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  async function acquireNonce(): Promise<number> {
    if (nextNonce === null) {
      nextNonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "latest" });
    }
    return nextNonce++;
  }

  /**
   * Submit a hub write. Calls are queued so nonces are assigned in call order.
   * Resolves with the tx hash as soon as the node accepts it (does NOT wait for the receipt).
   */
  function send(functionName: HubWriteName, args: readonly unknown[], value?: bigint): Promise<Hex> {
    const job = queue.then(async () => {
      // Pre-flight: a revert here costs nothing and carries the revert reason.
      const gas = await publicClient.estimateContractGas({
        abi,
        address: env.hub,
        functionName,
        args,
        account,
        value,
      });
      const nonce = await acquireNonce();
      try {
        return await walletClient.writeContract({
          abi,
          address: env.hub,
          functionName,
          args,
          value,
          account,
          chain: monadTestnet,
          nonce,
          gas: (gas * 12n) / 10n, // +20% buffer (Monad charges on gas LIMIT, so keep it tight)
        });
      } catch (e) {
        nextNonce = null; // resync from chain on next call
        throw e;
      }
    });
    queue = job.catch(() => undefined); // a failed job must not poison the queue
    return job;
  }

  /** send() + wait for the receipt. Throws if the tx reverted on-chain. */
  async function sendAndWait(functionName: HubWriteName, args: readonly unknown[], value?: bigint) {
    const hash = await send(functionName, args, value);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 });
    if (receipt.status !== "success") throw new Error(`tx reverted on-chain: ${hash}`);
    return { hash, receipt };
  }

  return { account, walletClient, send, sendAndWait };
}
export type AgentWallet = ReturnType<typeof makeAgentWallet>;
