import { addressUrl } from "@/lib/shared/chain";
import { HUB } from "@/lib/hub";
import { shortAddr } from "@/lib/format";

export default function Header({ head }: { head: bigint }) {
  return (
    <header className="header-glow sticky top-0 z-30 border-b border-edge/80 bg-void/80 backdrop-blur">
      <div className="relative mx-auto flex w-full max-w-[1560px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-monad/40 bg-monad/15 shadow-[0_0_18px_rgba(131,110,249,0.35)]">
            <span className="font-mono text-sm font-bold text-monad">A</span>
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-[0.3em] text-ink">AUTONOME</div>
            <div className="text-[11px] text-mute">A2A Compute &amp; Task Mesh</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-2 rounded-full border border-edge bg-panel/80 px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-pay" />
            <span className="text-ink">Monad Testnet</span>
            <span className="font-mono tabular-nums text-mute">
              blk {head > 0n ? head.toLocaleString() : "—"}
            </span>
          </span>
          <a
            href={addressUrl(HUB)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-edge bg-panel/80 px-3 py-1.5 font-mono text-monad transition hover:border-monad/50 hover:bg-monad/10"
          >
            Hub {shortAddr(HUB)} <span className="text-[10px]">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
}
