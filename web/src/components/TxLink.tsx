import { txUrl } from "@/lib/shared/chain";
import { shortAddr } from "@/lib/format";

export default function TxLink({
  hash,
  label,
  className,
}: {
  hash: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={txUrl(hash)}
      target="_blank"
      rel="noreferrer"
      title={txUrl(hash)}
      className={className ?? "font-mono text-monad hover:underline"}
    >
      {label ?? shortAddr(hash)} ↗
    </a>
  );
}
