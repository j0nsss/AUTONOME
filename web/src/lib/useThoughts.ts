"use client";

import { useEffect, useState } from "react";

export type Thought = { ts: number; agent: string; level: string; msg: string };

export function useThoughts(): Thought[] {
  const [thoughts, setThoughts] = useState<Thought[]>([]);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/telemetry");
      es.onmessage = (ev) => {
        try {
          const t = JSON.parse(ev.data) as Thought;
          if (typeof t?.ts !== "number" || typeof t?.msg !== "string") return;
          setThoughts((prev) => [...prev, t].slice(-100));
        } catch {
          /* ignore malformed line */
        }
      };
    } catch {
      /* SSE unavailable — thoughts stay empty */
    }
    return () => es?.close();
  }, []);

  return thoughts;
}
