import { txUrl } from "@/lib/shared/chain";
import { shortAddr } from "@/lib/format";

export default function TxLink({ hash, label }: { hash: string; label?: string }) {
  return (
    <a
      href={txUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-monad hover:underline"
    >
      {label ?? shortAddr(hash)} ↗
    </a>
  );
}
