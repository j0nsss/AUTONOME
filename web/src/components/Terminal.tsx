"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AgentView, FeedLine } from "@/lib/hub";
import { describe, fmtClock } from "@/lib/format";
import TxLink from "./TxLink";

export type Thought = { ts: number; agent: string; level: string; msg: string };

type Item =
  | { kind: "feed"; t: number; line: FeedLine }
  | { kind: "thought"; t: number; thought: Thought };

export default function Terminal({
  feed,
  nameOf,
  thoughts = [],
  agents = [],
}: {
  feed: FeedLine[];
  nameOf: (addr?: string) => string;
  thoughts?: Thought[];
  agents?: AgentView[];
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const items: Item[] = [
    ...feed.map((line) => ({ kind: "feed" as const, t: line.seenAt, line })),
    ...thoughts.map((thought) => ({ kind: "thought" as const, t: thought.ts, thought })),
  ].sort((a, b) => a.t - b.t);

  useEffect(() => {
    if (paused) return;
    const el = boxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [items.length, paused]);

  const workerIndex = (addr?: string) => {
    if (!addr) return 0;
    const workers = agents.filter((a) => a.role === "worker");
    const i = workers.findIndex((a) => a.address.toLowerCase() === addr.toLowerCase());
    return i < 0 ? 0 : i;
  };

  return (
    <div className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-edge/80 bg-black/60">
      <div className="flex items-center justify-between gap-2 border-b border-edge/70 bg-panel/40 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-mute">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-bad/80" />
            <span className="h-2 w-2 rounded-full bg-wrk2/80" />
            <span className="h-2 w-2 rounded-full bg-pay/80" />
          </span>
          <span className="ml-1.5 font-mono text-ink/80">autonome@monad:~</span>
          <span className="text-mute/60">live event stream</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-edge bg-void/60 px-2 py-0.5 text-[10px] text-mute">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-pay" />
            {feed.length + thoughts.length} events
          </span>
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-full border border-edge bg-void/60 px-2 py-0.5 text-[10px] text-mute transition hover:border-monad/50 hover:text-ink"
            aria-label={paused ? "Resume auto-scroll" : "Pause auto-scroll"}
          >
            {paused ? "resume" : "pause"}
          </button>
        </div>
      </div>

      <div
        ref={boxRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 font-mono text-[12px] leading-[1.7]"
      >
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="relative flex h-8 w-8 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-monad/20" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-monad" />
            </span>
            <div>
              <div className="text-sm text-ink/80">Waiting for on-chain events…</div>
              <div className="mt-1 text-[11px] text-mute">Agents post and settle tasks every few seconds.</div>
            </div>
          </div>
        ) : (
          items.map((item, i) => {
            const last = i === items.length - 1;
            if (item.kind === "thought") {
              return (
                <div
                  key={`t-${item.t}-${i}`}
                  className="flex items-baseline gap-2 rounded px-1 py-0.5 italic text-mute/90 transition-colors hover:bg-white/[0.025]"
                >
                  <span className="w-[74px] shrink-0 tabular-nums text-mute/60">{fmtClock(item.t)}</span>
                  <span className="hidden w-[64px] shrink-0 text-mute/40 sm:inline">·</span>
                  <span className="w-9 shrink-0 text-mute/60">░</span>
                  <span className="min-w-0 flex-1" style={{ overflowWrap: "anywhere" }}>
                    <span className="mr-1 not-italic text-mute/70">[{item.thought.agent}]</span>
                    <ThoughtMessage msg={item.thought.msg} />
                    {last ? <span className="ml-1 animate-blink not-italic">▍</span> : null}
                  </span>
                </div>
              );
            }
            const d = describe(item.line, nameOf);
            const color = d.tag === "WRK" && workerIndex(item.line.actor) === 1 ? "#fbbf24" : d.color;
            return (
              <div
                key={item.line.key}
                className="flex items-baseline gap-2 rounded px-1 py-0.5 transition-colors hover:bg-white/[0.025]"
              >
                <span className="w-[74px] shrink-0 tabular-nums text-mute/60">
                  {fmtClock(item.line.seenAt)}
                </span>
                <span className="hidden w-[64px] shrink-0 text-mute/40 sm:inline">
                  {item.line.block.toString()}
                </span>
                <span className="w-9 shrink-0 font-semibold" style={{ color }}>
                  {d.tag}
                </span>
                <span className="min-w-0 flex-1 text-ink/90" style={{ overflowWrap: "anywhere" }}>
                  {d.text}
                </span>
                <span className="shrink-0">
                  <TxLink hash={item.line.tx} />
                </span>
                {last ? <span className="ml-0.5 animate-blink text-ink/80">▍</span> : null}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

function ThoughtMessage({ msg }: { msg: string }) {
  const re = /https?:\/\/[^\s]+/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(msg)) !== null) {
    if (m.index > last) nodes.push(msg.slice(last, m.index));
    const url = m[0];
    const tx = url.match(/\/tx\/(0x[a-fA-F0-9]{64})/);
    if (tx) {
      nodes.push(<TxLink key={`u${k++}`} hash={tx[1]} />);
    } else {
      nodes.push(
        <span key={`u${k++}`} className="text-monad/80">
          {url.length > 44 ? `${url.slice(0, 41)}…` : url}
        </span>,
      );
    }
    last = m.index + url.length;
  }
  if (last < msg.length) nodes.push(msg.slice(last));
  return <>{nodes}</>;
}
