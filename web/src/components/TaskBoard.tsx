"use client";

import type { TaskView } from "@/lib/hub";
import { fmtMon, stripType } from "@/lib/format";
import TxLink from "./TxLink";

const STATUS_STYLE: Record<string, string> = {
  Open: "border-monad/40 bg-monad/10 text-monad",
  Claimed: "border-wrk2/40 bg-wrk2/10 text-wrk2",
  Completed: "border-pay/40 bg-pay/10 text-pay",
  Refunded: "border-bad/40 bg-bad/10 text-bad",
};

export default function TaskBoard({
  tasks,
  nameOf,
}: {
  tasks: Record<number, TaskView>;
  nameOf: (addr?: string) => string;
}) {
  const list = Object.values(tasks).sort((a, b) => b.id - a.id).slice(0, 10);

  return (
    <div className="flex flex-col gap-2">
      {list.length === 0 ? <div className="rounded-lg border border-edge bg-panel p-4 text-sm text-mute">no tasks yet</div> : null}
      {list.map((t) => {
        const { type } = stripType(t.prompt);
        return (
          <div key={`${t.id}-${t.status}`} className="animate-rise rounded-lg border border-edge bg-panel p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-ink">#{t.id}</span>
                <span className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-mute">{type}</span>
              </div>
              <span className={`rounded border px-2 py-0.5 text-[10px] ${STATUS_STYLE[t.status]}`}>{t.status}</span>
            </div>

            <div className="mt-1 flex items-center justify-between text-xs text-mute">
              <span className="truncate">
                {nameOf(t.requester)} → {t.worker ? nameOf(t.worker) : "…"}
              </span>
              <span className="font-mono text-ink">{fmtMon(t.reward)} MON</span>
            </div>

            {t.result ? (
              <div className="mt-2 line-clamp-2 text-xs text-mute">{t.result}</div>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
              {t.createTx ? <TxLink hash={t.createTx} label="create" /> : null}
              {t.claimTx ? <TxLink hash={t.claimTx} label="claim" /> : null}
              {t.completeTx ? <TxLink hash={t.completeTx} label="complete" /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
