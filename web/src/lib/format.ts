import { formatEther } from "viem";
import type { AgentView, FeedLine } from "./hub";

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function fmtMon(wei: bigint, dp = 4): string {
  const s = formatEther(wei);
  const [int, frac = ""] = s.split(".");
  const f = frac.slice(0, dp).replace(/0+$/, "");
  return f ? `${int}.${f}` : int;
}

export function fmtClock(ms: number): string {
  const d = new Date(ms);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export function stripType(prompt: string): { type: string; payload: string } {
  const i = prompt.indexOf("|");
  if (i < 1) return { type: "TASK", payload: prompt };
  return { type: prompt.slice(0, i), payload: prompt.slice(i + 1) };
}

export function makeNameOf(agents: AgentView[]): (addr?: string) => string {
  return (addr?: string) => {
    if (!addr) return "—";
    const a = agents.find((x) => x.address.toLowerCase() === addr.toLowerCase());
    return a?.name || shortAddr(addr);
  };
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export type Desc = { tag: "REQ" | "WRK" | "PAY" | "SYS"; color: string; text: string };

export function describe(line: FeedLine, nameOf: (addr?: string) => string): Desc {
  switch (line.kind) {
    case "AgentRegistered":
      return { tag: "SYS", color: "#8b87a8", text: `${line.note ?? "agent"} joined the mesh` };
    case "TaskCreated": {
      const { type } = stripType(line.note ?? "");
      return {
        tag: "REQ",
        color: "#22d3ee",
        text: `${nameOf(line.actor)} posted TASK #${line.taskId} [${type}] · ${fmtMon(line.amount ?? 0n)} MON escrowed`,
      };
    }
    case "TaskClaimed":
      return { tag: "WRK", color: "#34d399", text: `${nameOf(line.actor)} claimed TASK #${line.taskId}` };
    case "TaskCompleted":
      return {
        tag: "WRK",
        color: "#34d399",
        text: `${nameOf(line.actor)} delivered TASK #${line.taskId}: “${clip(line.note ?? "", 80)}”`,
      };
    case "PaymentReleased":
      return {
        tag: "PAY",
        color: "#34d399",
        text: `${fmtMon(line.amount ?? 0n)} MON → ${nameOf(line.actor)} for TASK #${line.taskId} ✓ settled`,
      };
    case "TaskRefunded":
      return {
        tag: "SYS",
        color: "#f87171",
        text: `TASK #${line.taskId} expired — ${fmtMon(line.amount ?? 0n)} MON refunded to ${nameOf(line.actor)}`,
      };
    default:
      return { tag: "SYS", color: "#8b87a8", text: "" };
  }
}
