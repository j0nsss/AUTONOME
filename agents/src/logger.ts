type Level = "info" | "ok" | "warn" | "error";

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};
export const COLORS = { cyan: "\x1b[36m", magenta: "\x1b[35m", green: "\x1b[32m", yellow: "\x1b[33m", blue: "\x1b[34m" };

/** Fire-and-forget POST to the Next.js telemetry route (P1). Never throws, never blocks. */
async function sendTelemetry(payload: Record<string, unknown>) {
  const url = process.env.TELEMETRY_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(500),
    });
  } catch {
    /* telemetry is best-effort */
  }
}

export function makeLogger(agent: string, color: string) {
  const emit = (level: Level, msg: string) => {
    const ts = new Date().toISOString().slice(11, 23);
    const lc = level === "ok" ? C.green : level === "warn" ? C.yellow : level === "error" ? C.red : C.dim;
    console.log(`${C.dim}${ts}${C.reset} ${color}[${agent}]${C.reset} ${lc}${msg}${C.reset}`);
    void sendTelemetry({ ts: Date.now(), agent, level, msg });
  };
  return {
    info: (m: string) => emit("info", m),
    ok: (m: string) => emit("ok", m),
    warn: (m: string) => emit("warn", m),
    error: (m: string) => emit("error", m),
  };
}
export type Logger = ReturnType<typeof makeLogger>;
