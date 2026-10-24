"use client";

import type { AgentView, FeedLine } from "@/lib/hub";
import { fmtMon } from "@/lib/format";
import { useNow } from "@/lib/useNow";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-edge bg-panel px-4 py-2">
      <div className="text-[10px] uppercase tracking-widest text-mute">{label}</div>
      <div className="font-mono text-lg tabular-nums text-ink">{value}</div>
      {hint ? <div className="text-[10px] text-mute">{hint}</div> : null}
    </div>
  );
}

export default function StatsBar({
  taskCount,
  agents,
  lifecycleBlocks,
  feed,
}: {
  taskCount: number;
  agents: AgentView[];
  lifecycleBlocks: number[];
  feed: FeedLine[];
}) {
  const now = useNow(1000);

  const settled = agents.reduce((n, a) => n + a.tasksCompleted, 0);
  const paid = agents.reduce((n, a) => n + a.totalEarned, 0n);
  const avg = lifecycleBlocks.length
    ? lifecycleBlocks.reduce((n, b) => n + b, 0) / lifecycleBlocks.length
    : null;
  const events = feed.filter((l) => l.seenAt > now - 10_000).length;

  return (
    <div className="grid grid-cols-2 gap-2 px-4 py-3 md:grid-cols-5">
      <Tile label="Tasks" value={String(taskCount)} />
      <Tile label="Settled" value={String(settled)} />
      <Tile label="MON Paid" value={fmtMon(paid)} />
      <Tile
        label="Avg lifecycle"
        value={avg === null ? "—" : `${avg.toFixed(1)} blk`}
        hint={avg === null ? undefined : `≈ ${(avg * 0.4).toFixed(1)} s`}
      />
      <Tile label="Events / 10s" value={String(events)} />
    </div>
  );
}
