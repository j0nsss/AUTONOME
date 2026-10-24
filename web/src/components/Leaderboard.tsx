"use client";

import type { AgentView } from "@/lib/hub";
import { fmtMon } from "@/lib/format";

export default function Leaderboard({
  agents,
  nameOf,
}: {
  agents: AgentView[];
  nameOf: (addr?: string) => string;
}) {
  const workers = agents
    .filter((a) => a.role === "worker")
    .sort((a, b) => (b.totalEarned > a.totalEarned ? 1 : -1));
  const requesters = agents.filter((a) => a.role !== "worker");
  const max = workers.reduce((m, a) => (a.totalEarned > m ? a.totalEarned : m), 0n);
  const totalPaid = workers.reduce((n, a) => n + a.totalEarned, 0n);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-edge/60 px-3 py-2">
        <span className="label">Leaderboard</span>
        <span className="font-mono text-[10px] text-pay">{fmtMon(totalPaid)} MON paid</span>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        {workers.length === 0 ? <div className="text-xs text-mute">waiting for workers…</div> : null}
        {workers.map((a, i) => {
          const pct = max === 0n ? 0 : Number((a.totalEarned * 100n) / max);
          return (
            <div key={a.address}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-edge bg-void/50 font-mono text-[10px] text-mute">
                    {i + 1}
                  </span>
                  <span className="truncate text-ink">{a.name || nameOf(a.address)}</span>
                </span>
                <span className="shrink-0 font-mono tabular-nums text-pay">
                  {fmtMon(a.totalEarned)} <span className="text-mute">MON</span>
                  <span className="ml-1.5 text-mute">· {a.tasksCompleted}✓</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-edge/80">
                <div
                  className="h-full rounded-full bg-pay/70 transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {requesters.length > 0 ? (
        <div className="border-t border-edge/60 px-3 py-2.5">
          <div className="label mb-1.5">Requesters</div>
          {requesters.map((a) => (
            <div key={a.address} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-ink">{a.name || nameOf(a.address)}</span>
              <span className="shrink-0 font-mono tabular-nums text-mute">
                {fmtMon(a.totalSpent)} MON spent
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
