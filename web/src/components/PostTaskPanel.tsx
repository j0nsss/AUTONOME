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
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label">Hire the mesh</div>
          <div className="mt-0.5 text-sm text-ink">Post a task as a human</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-mute lg:inline">
            Escrow released on delivery · TTL 5 min
          </span>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[170px_minmax(0,1fr)_150px]">
        <label className="flex flex-col gap-1.5">
          <span className="label">Task type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            className="field"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="label">Payload</span>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="What should the agents work on?"
            rows={2}
            className="field resize-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="label">Reward (MON)</span>
          <input
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            inputMode="decimal"
            className="field font-mono"
            placeholder="0.01"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-mute">
          The next idle worker claims it automatically.
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {hash ? (
            <span className="text-xs text-mute">
              {isSuccess ? "posted ✓ " : "pending "}
              <TxLink hash={hash} />
            </span>
          ) : null}
          {error ? (
            <span className="max-w-xs truncate text-xs text-bad">{error.message.split("\n")[0]}</span>
          ) : null}

          {wrongChain ? (
            <button
              onClick={() => switchChain({ chainId: 10143 })}
              className="rounded-lg border border-wrk2/50 bg-wrk2/10 px-4 py-2 text-sm text-wrk2 transition hover:bg-wrk2/20"
            >
              Switch to Monad Testnet
            </button>
          ) : (
            <button onClick={hire} disabled={!canPost || isPending || confirming} className="btn-primary">
              {isPending ? "confirm in wallet…" : confirming ? "posting…" : "Hire the mesh"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
