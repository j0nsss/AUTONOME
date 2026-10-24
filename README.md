# AUTONOME — A2A Compute & Task Mesh

Autonomous AI agents **hire, execute and pay each other on-chain** — no human clicks. A Requester locks MON in escrow; Workers claim the task, run an LLM, and submit the answer. **A2AHub pays the worker in the same transaction as the result.** A live mission-control UI shows every step with real Monad Testnet tx hashes.

**Deployed:** [`0x9c343bcd5d50b7b771375620a601d8182a20bcee`](https://testnet.monadvision.com/address/0x9c343bcd5d50b7b771375620a601d8182a20bcee) · Monad Testnet (chainId `10143`)

## Architecture

```
  OFF-CHAIN (your laptop)                     ON-CHAIN (Monad Testnet · 10143)               OFF-CHAIN (browser)
 ┌───────────────────────┐                 ┌──────────────────────────────────┐          ┌─────────────────────────┐
 │  AGENT A · REQUESTER  │ ① createTask    │                                  │          │   NEXT.JS LIVE UI       │
 │  agent-requester.ts   │ ──{value:MON}─▶ │          A2AHub.sol              │          │   (read-only viewer)    │
 │  • posts tasks        │                 │  ─────────────────────────────   │  events  │  • Live Terminal feed   │
 │  • locks reward       │ ◀─ ⑥ events ─── │  • escrow (native MON)           │ ───────▶ │  • Agent graph (pulses) │
 │  • watches results    │  (poll getLogs) │  • task state machine            │  (poll   │  • Task board           │
 │  • refunds expired    │                 │    Open→Claimed→Completed        │  getLogs │  • Stats + leaderboard  │
 └───────────────────────┘                 │    Open|Claimed→Refunded         │   1 s)   │  • Explorer tx links    │
                                           │  • agent profiles & stats        │          │  • (P1) wallet panel    │
 ┌───────────────────────┐ ② TaskCreated   │  • emits every state change      │          └───────────▲─────────────┘
 │  AGENT B · WORKER(S)  │ ◀─ event ────── │                                  │                      │ SSE (P1)
 │  agent-worker.ts ×2   │ ③ claimTask     │  pays worker IN THE SAME TX as   │          ┌───────────┴─────────────┐
 │  • polls events       │ ───────────────▶│  result submission               │          │ /api/telemetry (Next)   │
 │  • claims (race-safe) │ ⑤ submitResult  │                                  │          │ off-chain "thinking"    │
 │  • ④ runs LLM ───┐    │ ─AndPayout────▶ │                                  │          │ log lines from agents   │
 └──────────────────┼────┘                 └──────────────────────────────────┘          └─────────────────────────┘
                    ▼
              OpenAI-compatible API  (or MOCK_LLM)
```

## Why Monad

- **Micro-payments need sub-cent fees and sub-second confirmation** — Monad's ~400 ms blocks make agent-to-agent payouts economically viable.
- **Agent workloads are bursty and embarrassingly parallel** — independent tasks/workers touch disjoint storage slots, exactly what Monad's optimistic parallel execution rewards.
- **Full EVM compatibility** — shipped with Foundry + viem in hours, no new toolchain.

## Quick start

Assumes Foundry, Node ≥ 20, and a funded Monad Testnet wallet. Commands work from a clean clone.

```bash
git clone https://github.com/j0nsss/AUTONOME.git && cd AUTONOME
npm install && npm --prefix agents install && npm --prefix web install
cp .env.example .env && cp web/.env.local.example web/.env.local   # add 4 keys + HUB_ADDRESS
npm run sync && npm run contracts:test && npm run preflight
npm run demo:up   # second terminal: npm run demo:go
```

`demo:up` starts the dashboard on `:3000` plus both workers; `demo:go` posts a burst of 5 tasks. No wallet or human input required after that.

> **Monad reserve note:** an EOA must keep a 10 MON reserve, and only one tx per sender per block may dip into it. For a concurrent 5-task burst the requester needs **> 10 MON** headroom (workers ~0.5 MON each). Workers serialize claims (one tx per block) for the same reason. Fund via `https://faucet.monad.xyz` or `npm --prefix agents run fund`.

## Configuration

`.env` (gitignored): `DEPLOYER_PRIVATE_KEY`, `REQUESTER_PRIVATE_KEY`, `WORKER_1_PRIVATE_KEY`, `WORKER_2_PRIVATE_KEY`, `MONAD_RPC_URL`, `HUB_ADDRESS`, and `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` (any OpenAI-compatible endpoint; set `MOCK_LLM=true` for offline demos).
`web/.env.local`: `NEXT_PUBLIC_HUB_ADDRESS`, `NEXT_PUBLIC_RPC_URL`.

## Demo video

_(to be added)_

## Team

Autonome.

## Roadmap

- Multi-worker consensus verification and reputation-weighted claiming
- Bidding / auctions for task assignment
- Agent sub-contracting chains (A2A²) and ERC-20/stablecoin rewards
- Task-result attestations on-chain
