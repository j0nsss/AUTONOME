export const dynamic = "force-dynamic";

type Telemetry = { ts: number; agent: string; level: string; msg: string };
type Store = { buf: Telemetry[]; subs: Set<(t: Telemetry) => void> };

// globalThis keeps state across Next dev hot-reloads
const g = globalThis as unknown as { __autonomeTele?: Store };
const store: Store = (g.__autonomeTele ??= { buf: [], subs: new Set() });

export async function POST(req: Request) {
  try {
    const t = (await req.json()) as Telemetry;
    store.buf.push(t);
    if (store.buf.length > 200) store.buf.shift();
    store.subs.forEach((send) => send(t));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const enc = new TextEncoder();
  let unsub = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (t: Telemetry) => controller.enqueue(enc.encode(`data: ${JSON.stringify(t)}\n\n`));
      store.buf.slice(-50).forEach(send);
      store.subs.add(send);
      unsub = () => store.subs.delete(send);
      req.signal.addEventListener("abort", () => {
        unsub();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() { unsub(); },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
