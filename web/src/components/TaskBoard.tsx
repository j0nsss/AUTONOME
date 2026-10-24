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

const STATUS_DOT: Record<string, string> = {
  Open: "bg-monad",
  Claimed: "bg-wrk2",
  Completed: "bg-pay",
  Refunded: "bg-bad",
};

export default function TaskBoard({
  tasks,
  nameOf,
}: {
  tasks: Record<number, TaskView>;
  nameOf: (addr?: string) => string;
}) {
  const list = Object.values(tasks)
    .sort((a, b) => b.id - a.id)
    .slice(0, 10);

  if (list.length === 0) {
    return (
      <div className="card flex min-h-[160px] items-center justify-center p-4 text-sm text-mute">
        no tasks yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {list.map((t) => {
        const { type, payload } = stripType(t.prompt);
        const style = STATUS_STYLE[t.status] ?? "border-edge bg-void/40 text-mute";
        const dot = STATUS_DOT[t.status] ?? "bg-mute";
        return (
          <article
            key={`${t.id}-${t.status}`}
            className="card animate-rise p-3 transition-colors hover:border-edge"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-sm font-semibold text-ink">#{t.id}</span>
                <span className="chip truncate">{type}</span>
              </div>
              <span
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${style}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {t.status}
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-[11px] text-mute">
                {nameOf(t.requester)}
                <span className="mx-1 text-mute/50">→</span>
                <span className={t.worker ? "text-ink/80" : "text-mute/60"}>
                  {t.worker ? nameOf(t.worker) : "unclaimed"}
                </span>
              </span>
              <span className="shrink-0 font-mono text-sm tabular-nums text-ink">
                {fmtMon(t.reward)} <span className="text-[10px] text-mute">MON</span>
              </span>
            </div>

            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-mute/90">
              {t.status === "Completed" && t.result ? t.result : payload}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.createTx ? <TxLink hash={t.createTx} label="create" className="tx-chip" /> : null}
              {t.claimTx ? <TxLink hash={t.claimTx} label="claim" className="tx-chip" /> : null}
              {t.completeTx ? <TxLink hash={t.completeTx} label="pay" className="tx-chip" /> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
