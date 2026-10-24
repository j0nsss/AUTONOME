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
  const workers = agents.filter((a) => a.role === "worker").sort((a, b) => (b.totalEarned > a.totalEarned ? 1 : -1));
  const requesters = agents.filter((a) => a.role !== "worker");
  const max = workers.reduce((m, a) => (a.totalEarned > m ? a.totalEarned : m), 0n);

  return (
    <div className="rounded-lg border border-edge bg-panel p-3">
      <div className="mb-2 text-[10px] uppercase tracking-widest text-mute">Leaderboard</div>

      <div className="flex flex-col gap-2">
        {workers.length === 0 ? <div className="text-xs text-mute">waiting for workers…</div> : null}
        {workers.map((a, i) => {
          const pct = max === 0n ? 0 : Number((a.totalEarned * 100n) / max);
          return (
            <div key={a.address}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="truncate">
                  <span className="mr-1 text-mute">{i + 1}</span>
                  <span className="text-ink">{a.name || nameOf(a.address)}</span>
                </span>
                <span className="font-mono text-pay">
                  {fmtMon(a.totalEarned)} MON <span className="text-mute">· {a.tasksCompleted}✓</span>
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded bg-edge">
                <div className="h-full rounded bg-pay/70" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {requesters.length > 0 ? (
        <div className="mt-3 border-t border-edge pt-2">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-mute">Requesters</div>
          {requesters.map((a) => (
            <div key={a.address} className="flex justify-between text-xs">
              <span className="truncate text-ink">{a.name || nameOf(a.address)}</span>
              <span className="font-mono text-mute">{fmtMon(a.totalSpent)} MON spent</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
