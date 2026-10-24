import { formatEther } from "viem";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const mon = (wei: bigint) => `${formatEther(wei)} MON`;
export const clip = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** One-line, human-readable error (viem errors expose `shortMessage`). */
export function shortErr(e: unknown): string {
  const x = e as { shortMessage?: string; message?: string };
  return (x.shortMessage ?? x.message ?? String(e)).split("\n")[0].slice(0, 180);
}
