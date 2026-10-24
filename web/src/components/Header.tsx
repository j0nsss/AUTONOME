import { addressUrl } from "@/lib/shared/chain";
import { HUB } from "@/lib/hub";
import { shortAddr } from "@/lib/format";

export default function Header({ head }: { head: bigint }) {
  return (
    <header className="header-glow relative flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-3">
      <div className="flex items-baseline gap-3">
        <span className="text-xl font-bold tracking-[0.35em] text-ink drop-shadow-[0_0_12px_rgba(131,110,249,0.8)]">
          AUTONOME
        </span>
        <span className="hidden text-xs text-mute sm:inline">A2A Compute &amp; Task Mesh</span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1">
          <span className="h-2 w-2 animate-blink rounded-full bg-pay" />
          <span className="text-ink">Monad Testnet</span>
          <span className="font-mono text-mute">blk {head.toLocaleString()}</span>
        </span>
        <a
          href={addressUrl(HUB)}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-edge bg-panel px-3 py-1 font-mono text-monad hover:underline"
        >
          Hub {shortAddr(HUB)} ↗
        </a>
      </div>
    </header>
  );
}
