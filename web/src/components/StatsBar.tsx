"use client";

import type { AgentView, FeedLine } from "@/lib/hub";
import { fmtMon } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { Activity, BadgeCheck, Coins, ListChecks, Timer } from "lucide-react";

function Tile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Activity;
}) {
  return (
    <div className="card flex items-start justify-between gap-2 px-4 py-2.5">
      <div className="min-w-0">
        <div className="label">{label}</div>
        <div className="mt-0.5 truncate font-mono text-xl font-semibold tabular-nums tracking-tight text-ink">
          {value}
        </div>
        {hint ? <div className="mt-0.5 text-[10px] text-mute">{hint}</div> : null}
      </div>
      <Icon className="mt-1 h-4 w-4 shrink-0 text-mute/70" strokeWidth={1.75} />
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
    <div className="grid grid-cols-2 gap-2 py-3 md:grid-cols-5">
      <Tile label="Tasks" value={String(taskCount)} icon={ListChecks} />
      <Tile label="Settled" value={String(settled)} icon={BadgeCheck} />
      <Tile label="MON paid" value={fmtMon(paid)} icon={Coins} />
      <Tile
        label="Avg lifecycle"
        value={avg === null ? "—" : `${avg.toFixed(1)} blk`}
        hint={avg === null ? undefined : `≈ ${(avg * 0.4).toFixed(1)} s`}
        icon={Timer}
      />
      <Tile label="Events / 10s" value={String(events)} icon={Activity} />
    </div>
  );
}
