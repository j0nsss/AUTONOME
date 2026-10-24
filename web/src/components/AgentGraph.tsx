"use client";

import type { AgentView, FeedLine } from "@/lib/hub";
import { useNow } from "@/lib/useNow";

const HUB = { x: 150, y: 160, color: "#836EF9" };
const REQ_COLOR = "#22d3ee";
const WRK_COLORS = ["#34d399", "#fbbf24", "#836EF9"];

type Pos = { x: number; y: number; color: string };

export default function AgentGraph({
  agents,
  feed,
  nameOf,
}: {
  agents: AgentView[];
  feed: FeedLine[];
  nameOf: (addr?: string) => string;
}) {
  const now = useNow(300);

  const requesters = agents.filter((a) => a.role === "requester");
  const workers = agents.filter((a) => a.role === "worker");

  const yFor = (i: number, n: number) => (n <= 1 ? HUB.y : 58 + i * (204 / (n - 1)));

  const pos = new Map<string, Pos>();
  requesters.forEach((a, i) =>
    pos.set(a.address.toLowerCase(), { x: 48, y: yFor(i, requesters.length), color: REQ_COLOR }),
  );
  workers.forEach((a, i) =>
    pos.set(a.address.toLowerCase(), {
      x: 252,
      y: yFor(i, workers.length),
      color: WRK_COLORS[i] ?? WRK_COLORS[2],
    }),
  );

  const pulses = feed
    .filter((l) => now - l.seenAt < 1400)
    .map((l) => {
      const p = l.actor ? pos.get(l.actor.toLowerCase()) : undefined;
      if (!p) return null;
      let from = p;
      let to = HUB;
      let color = p.color;
      if (l.kind === "PaymentReleased") {
        from = HUB;
        to = p;
        color = "#34d399";
      } else if (l.kind === "TaskRefunded") {
        from = HUB;
        to = p;
        color = "#f87171";
      } else if (l.kind === "AgentRegistered") {
        return null;
      }
      return { key: l.key, from, to, color };
    })
    .filter((x): x is { key: string; from: Pos; to: Pos; color: string } => x !== null);

  if (agents.length === 0) {
    return (
      <div className="card flex h-[320px] items-center justify-center text-sm text-mute">
        waiting for agents…
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-edge/60 px-3 py-2">
        <span className="label">Agent mesh</span>
        <span className="flex items-center gap-1.5 text-[10px] text-mute">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-pay" />
          live
        </span>
      </div>

      <div className="px-2 pt-2">
        <svg viewBox="0 0 300 320" className="h-auto w-full">
          <text x={48} y={20} textAnchor="middle" fill="#8b87a8" fontSize={8} letterSpacing={1.5}>
            REQUESTERS
          </text>
          <text x={252} y={20} textAnchor="middle" fill="#8b87a8" fontSize={8} letterSpacing={1.5}>
            WORKERS
          </text>

          {[...pos.values()].map((p, i) => (
            <line
              key={`edge-${i}`}
              x1={p.x}
              y1={p.y}
              x2={HUB.x}
              y2={HUB.y}
              stroke="#231f3a"
              strokeWidth={1.5}
            />
          ))}

          {pulses.map((p) => (
            <circle key={p.key} r={4} fill={p.color}>
              <animateMotion
                dur="0.9s"
                fill="freeze"
                path={`M ${p.from.x} ${p.from.y} L ${p.to.x} ${p.to.y}`}
              />
            </circle>
          ))}

          <circle
            cx={HUB.x}
            cy={HUB.y}
            r={30}
            fill="#836EF9"
            fillOpacity={0.16}
            stroke="#836EF9"
            strokeWidth={1.5}
          />
          <text x={HUB.x} y={HUB.y - 2} textAnchor="middle" fill="#e7e5f4" fontSize={11} fontWeight={700}>
            A2AHub
          </text>
          <text x={HUB.x} y={HUB.y + 12} textAnchor="middle" fill="#8b87a8" fontSize={9}>
            escrow
          </text>

          {agents.map((a) => {
            const p = pos.get(a.address.toLowerCase());
            if (!p) return null;
            const below = p.y < 290;
            const name = a.name || nameOf(a.address);
            return (
              <g key={a.address}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={23}
                  fill={p.color}
                  fillOpacity={0.15}
                  stroke={p.color}
                  strokeWidth={1.5}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  fill="#e7e5f4"
                  fontSize={9}
                  fontWeight={700}
                >
                  {name.slice(0, 9)}
                </text>
                <text
                  x={p.x}
                  y={below ? p.y + 37 : p.y - 29}
                  textAnchor="middle"
                  fill="#8b87a8"
                  fontSize={9}
                >
                  {a.role === "worker" ? `${a.tasksCompleted} settled` : `${a.tasksPosted} posted`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edge/60 px-3 py-2 text-[10px] text-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-req" /> requester
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-monad" /> escrow
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-wrk1" /> worker
        </span>
      </div>
    </div>
  );
}
