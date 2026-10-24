"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { a2aHubAbi } from "@/lib/shared/abi";
import { HUB } from "@/lib/hub";
import TxLink from "./TxLink";

const TYPES = ["SUMMARIZE", "SENTIMENT", "TRANSLATE_ES", "CODE_REVIEW"] as const;
type TaskType = (typeof TYPES)[number];

export default function PostTaskPanel() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [type, setType] = useState<TaskType>("SUMMARIZE");
  const [payload, setPayload] = useState("");
  const [reward, setReward] = useState("0.01");

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const wrongChain = isConnected && chainId !== 10143;
  const canPost = isConnected && !wrongChain && payload.trim().length > 0 && Number(reward) > 0;

  function hire() {
    if (!canPost) return;
    writeContract({
      abi: a2aHubAbi,
      address: HUB,
      functionName: "createTask",
      args: [`${type}|${payload.trim()}`, 300n],
      value: parseEther(reward),
    });
  }

  return (
    <div className="rounded-lg border border-edge bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-mute">Hire the mesh</div>
          <div className="text-sm text-ink">Post a task as a human</div>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" />
      </div>

      <div className="grid gap-2 md:grid-cols-[160px_1fr_120px]">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TaskType)}
          className="rounded border border-edge bg-void px-2 py-2 text-sm text-ink"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder="Payload the agents should work on…"
          rows={2}
          className="rounded border border-edge bg-void px-2 py-2 text-sm text-ink placeholder:text-mute"
        />

        <input
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          inputMode="decimal"
          className="rounded border border-edge bg-void px-2 py-2 font-mono text-sm text-ink"
          placeholder="MON"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {wrongChain ? (
          <button
            onClick={() => switchChain({ chainId: 10143 })}
            className="rounded border border-wrk2/50 bg-wrk2/10 px-3 py-2 text-sm text-wrk2"
          >
            Switch to Monad Testnet
          </button>
        ) : (
          <button
            onClick={hire}
            disabled={!canPost || isPending || confirming}
            className="rounded border border-monad/50 bg-monad/20 px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "confirm in wallet…" : confirming ? "posting…" : "Hire the mesh"}
          </button>
        )}

        {hash ? (
          <span className="text-xs">
            {isSuccess ? "posted ✓ " : "pending "}
            <TxLink hash={hash} />
          </span>
        ) : null}
        {error ? <span className="text-xs text-bad">{error.message.split("\n")[0]}</span> : null}
      </div>
    </div>
  );
}
