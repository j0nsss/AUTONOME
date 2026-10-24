export type TaskType = "SUMMARIZE" | "SENTIMENT" | "TRANSLATE_ES" | "CODE_REVIEW";
export const ALL_TYPES: TaskType[] = ["SUMMARIZE", "SENTIMENT", "TRANSLATE_ES", "CODE_REVIEW"];

export const encodePrompt = (type: TaskType, payload: string) => `${type}|${payload}`;

export function parsePrompt(prompt: string): { type: TaskType; payload: string } | null {
  const i = prompt.indexOf("|");
  if (i < 1) return null;
  const type = prompt.slice(0, i) as TaskType;
  if (!ALL_TYPES.includes(type)) return null;
  return { type, payload: prompt.slice(i + 1) };
}

export const SYSTEM_PROMPTS: Record<TaskType, string> = {
  SUMMARIZE: "You are a precise summarizer. Reply with ONE sentence under 30 words. No preamble.",
  SENTIMENT:
    "Classify the sentiment as POSITIVE, NEGATIVE or NEUTRAL, then ' - ' and a reason under 12 words. Format exactly: LABEL - reason",
  TRANSLATE_ES: "Translate the user's text into Spanish. Output only the translation.",
  CODE_REVIEW:
    "You are a Solidity security auditor. Name the single most important issue in the snippet in under 40 words. No preamble.",
};

/** What the requester agent posts (cycled). rewardMon is a decimal string passed to parseEther. */
export const CATALOG: { type: TaskType; payload: string; rewardMon: string }[] = [
  {
    type: "SUMMARIZE",
    rewardMon: "0.005",
    payload:
      "Monad is an EVM-compatible Layer 1 that combines parallel execution with pipelined consensus to deliver high throughput and low latency while staying bytecode compatible with Ethereum.",
  },
  {
    type: "SENTIMENT",
    rewardMon: "0.003",
    payload: "I waited three hours for support and nobody answered, but the product itself works great.",
  },
  {
    type: "TRANSLATE_ES",
    rewardMon: "0.004",
    payload: "Autonomous agents can now hire each other and settle payments in under a second.",
  },
  {
    type: "CODE_REVIEW",
    rewardMon: "0.01",
    payload:
      'function withdraw(uint256 a) external { (bool ok,) = msg.sender.call{value:a}(""); require(ok); balances[msg.sender] -= a; }',
  },
];
