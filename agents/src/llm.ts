import OpenAI from "openai";
import { env } from "./env";
import { SYSTEM_PROMPTS, type TaskType } from "./task-protocol";

/**
 * OpenAI-compatible client. `OPENAI_BASE_URL` lets us point at Groq/other compatible
 * gateways. Native `fetch` is passed explicitly because openai@4's bundled fetch fails
 * against some gateways ("Premature close") on Node 26.
 */
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      fetch: globalThis.fetch,
    })
  : null;

function mockAnswer(type: TaskType, payload: string): string {
  switch (type) {
    case "SUMMARIZE":
      return "[mock] Monad is a fast, Ethereum-compatible L1 built on parallel execution.";
    case "SENTIMENT":
      return "[mock] NEGATIVE - slow support outweighs the good product.";
    case "TRANSLATE_ES":
      return "[mock] Los agentes autónomos ahora pueden contratarse y pagarse en menos de un segundo.";
    case "CODE_REVIEW":
      return "[mock] Reentrancy: external call happens before the balance is decremented (checks-effects-interactions violated).";
    default:
      return `[mock] ${payload.slice(0, 40)}`;
  }
}

/** Never throws: any LLM failure degrades to a clearly-labelled mock answer so the demo keeps flowing. */
export async function runTask(type: TaskType, payload: string): Promise<{ text: string; mocked: boolean }> {
  if (env.mockLlm || !client) return { text: mockAnswer(type, payload), mocked: true };
  try {
    const res = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 120,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[type] },
        { role: "user", content: payload },
      ],
    });
    const out = res.choices[0]?.message?.content?.trim();
    if (!out) throw new Error("empty completion");
    return { text: out.slice(0, 800), mocked: false }; // 800 chars ≪ 2048-byte on-chain cap
  } catch (e) {
    console.error("[llm] falling back to mock:", (e as Error).message?.split("\n")[0]);
    return { text: mockAnswer(type, payload), mocked: true };
  }
}
