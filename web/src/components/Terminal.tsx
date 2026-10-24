"use client";

import { useEffect, useRef, useState } from "react";
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
  const [atBottom, setAtBottom] = useState(true);
  const [paused, setPaused] = useState(false);

  const items: Item[] = [
    ...feed.map((line) => ({ kind: "feed" as const, t: line.seenAt, line })),
    ...thoughts.map((thought) => ({ kind: "thought" as const, t: thought.ts, thought })),
  ].sort((a, b) => a.t - b.t);

  const onScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setAtBottom(near);
    if (near) setPaused(false);
  };

  useEffect(() => {
    if (!atBottom) {
      setPaused(true);
      return;
    }
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length, atBottom]);

  const scrollToBottom = () => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setAtBottom(true);
    setPaused(false);
  };

  const workerIndex = (addr?: string) => {
    if (!addr) return 0;
    const workers = agents.filter((a) => a.role === "worker");
    const i = workers.findIndex((a) => a.address.toLowerCase() === addr.toLowerCase());
    return i < 0 ? 0 : i;
  };

  return (
    <div className="relative flex h-full min-h-[60vh] flex-col overflow-hidden rounded-lg border border-edge bg-black/70">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2 text-[11px] text-mute">
        <span className="text-bad">●</span>
        <span className="text-wrk2">●</span>
        <span className="text-pay">●</span>
        <span className="ml-2 font-mono">autonome@monad:~ live</span>
      </div>

      <div ref={boxRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[13px] leading-6">
        {items.length === 0 ? (
          <div className="text-mute">waiting for on-chain events…</div>
        ) : (
          items.map((item, i) => {
            const last = i === items.length - 1;
            if (item.kind === "thought") {
              return (
                <div key={`t-${item.t}-${i}`} className="animate-rise italic text-mute">
                  <span className="mr-2">{fmtClock(item.t)}</span>
                  <span className="mr-1">░</span>
                  <span className="mr-1">[{item.thought.agent}]</span>
                  {item.thought.msg}
                  {last ? <span className="ml-1 animate-blink">▍</span> : null}
                </div>
              );
            }
            const d = describe(item.line, nameOf);
            const color = d.tag === "WRK" && workerIndex(item.line.actor) === 1 ? "#fbbf24" : d.color;
            return (
              <div key={item.line.key} className="animate-rise">
                <span className="mr-2 text-mute">{fmtClock(item.line.seenAt)}</span>
                <span className="mr-2 text-mute">blk {item.line.block.toString()}</span>
                <span className="mr-2 font-semibold" style={{ color }}>
                  [{d.tag}]
                </span>
                <span className="text-ink">{d.text}</span>
                <span className="ml-2">
                  <TxLink hash={item.line.tx} />
                </span>
                {last ? <span className="ml-1 animate-blink text-ink">▍</span> : null}
              </div>
            );
          })
        )}
      </div>

      {paused && !atBottom ? (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-monad/50 bg-monad/20 px-3 py-1 text-xs text-ink backdrop-blur"
        >
          ↓ new events
        </button>
      ) : null}
    </div>
  );
}
