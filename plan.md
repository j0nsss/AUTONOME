# AUTONOME — A2A Compute & Task Mesh
### Decentralized Agent-to-Agent Micro-Economy on Monad · 6-Hour Build Blueprint (`plan.md`)

> **Audience:** AI coding agents (Cursor / Windsurf / Claude Code) + the human driving them.
> **Rule zero:** Everything in this file is *frozen spec*. Where code is provided, **copy it verbatim**, then run the verification command. Do not "improve" signatures, names, versions or file paths — other files depend on them.

---

## 0. MISSION BRIEF

**One-liner:** Autonome lets autonomous AI agents **hire, execute and pay each other on-chain** with zero human clicks. A *Requester* agent locks MON in escrow for a micro-task; a *Worker* agent notices it, claims it, runs it through an LLM, and submits the answer — the contract **pays the worker in the same transaction**. A live "mission-control" UI shows every step with real Monad Testnet tx hashes.

### 0.1 The Demo Contract (what "done" means)
With 3 terminals running and a browser open, **within 3 minutes and with no human input after pressing one key**, a viewer sees:
1. ≥ 5 tasks go `Open → Claimed → Completed (paid)` with real tx hashes that open in the Monad explorer.
2. At least **two different worker agents** earning concurrently (leaderboard moves).
3. A live terminal feed + agent graph + stats bar updating within ~1–2 s of each on-chain event.

### 0.2 Scope & priorities
| Priority | Item | Cut-line |
|---|---|---|
| **P0** (must ship) | `A2AHub.sol` + tests + deploy · requester agent · worker agent (×2 instances) · read-only live dashboard (terminal, task board, stats, leaderboard) · preflight + demo scripts | Never cut |
| **P1** (should ship) | Agent graph w/ animated pulses · off-chain "thinking" telemetry stream (SSE) · burst mode · refund watchdog · wallet-connect "Post a task as a human" panel | Cut at T+4:30 |
| **P2** (stretch) | Agent sub-contracting (worker hires worker) · contention-free task IDs · multi-worker consensus · bidding | Only if P0+P1 are green before T+5:00 |

### 0.3 Frozen technical decisions (do not relitigate)
| Decision | Choice | Why (hackathon-grade reasoning) |
|---|---|---|
| Contract toolchain | **Foundry** (`forge`) | Fast compile/test loop; deploy script is one command |
| Solidity | `0.8.24`, `evm_version = "cancun"`, **no OpenZeppelin** | Zero dependency risk; hand-rolled 3-line reentrancy guard |
| Chain client | **viem v2 only** (no ethers) | Typed ABIs via `parseAbi`; same library used by wagmi/RainbowKit |
| Event consumption | **Own `getLogs` polling loop** (≤ 99-block ranges), *not* `watchContractEvent`, *not* WebSocket subscriptions | Public RPC has strict rate/range limits and filter/WS support can be flaky; a bounded poller is deterministic |
| Agent runtime | Node ≥ 20 + TypeScript run with **`tsx`** | No build step |
| LLM | **OpenAI SDK directly** (`openai@4`), model from env, with `MOCK_LLM` fallback | LangChain adds failure surface and zero value for single-shot tasks |
| Frontend | **Next.js 14 (App Router) + React 18 + Tailwind 3 + lucide-react**; wagmi 2 / RainbowKit 2 only for the P1 wallet panel | Pinned to a known-good combo; do **not** upgrade |
| Fonts | System font stack only | `next/font/google` needs network at dev time — hackathon Wi-Fi is hostile |
| Payments | Native **MON** (no ERC-20) | One fewer contract, approval flow, and failure mode |

### 0.4 Monad Testnet facts (verified against docs.monad.xyz on 2026-10-24 — re-check if anything 404s)
| Item | Value |
|---|---|
| Network name | `Monad Testnet` |
| **Chain ID** | **`10143`** |
| Native token | `MON` (18 decimals) |
| Public RPC (HTTP) | `https://testnet-rpc.monad.xyz` (QuickNode-hosted, **~25 req/s**) |
| Public RPC (WS) | `wss://testnet-rpc.monad.xyz` *(we do not use WS)* |
| Backup RPC | `https://rpc-testnet.monadinfra.com` (**~20 req/s, no batching**) · `https://rpc.ankr.com/monad_testnet` |
| Explorer (primary) | MonadVision — `https://testnet.monadvision.com` (tx: `/tx/<hash>`, address: `/address/<addr>`) |
| Explorer (alt) | `https://testnet.monadscan.com` · `https://monad-testnet.socialscan.io` |
| Faucet | `https://faucet.monad.xyz` |
| Docs | `https://docs.monad.xyz` |

**Monad-specific gotchas baked into this plan:**
- **~400 ms blocks, near-instant finality** → viem's default `pollingInterval` (4000 ms) makes everything *look* slow. We set it to 500 ms (agents) / 1000 ms (browser).
- **Gas is charged on the gas *limit*, not gas used** → never hard-code giant gas limits. We use `estimateContractGas` and add a 20 % buffer.
- **Public RPC `eth_getLogs` has a small max block range** → we assume **100 blocks** and chunk at 99.
- **Rate limits are per-IP** → budget in §1.5.
- **Parallel execution is optimistic & transparent** → you don't write special code; you win by making independent transactions touch *disjoint storage*. Our design: `claimTask`/`submitResultAndPayout` for *different* task IDs and *different* workers touch disjoint slots. (`createTask` increments the shared `taskCount` — a known hot spot; see P2 stretch "contention-free IDs".)

### 0.5 Time budget
| Phase | Window | Output | Gate to proceed |
|---|---|---|---|
| **0 · Bootstrap** | 0:00 – 0:30 | Repo, wallets funded, `.env`, tooling installed | `forge --version`, `node -v` ≥ 20, 4 wallets have MON |
| **1 · Smart contract** | 0:30 – 1:30 | `A2AHub.sol`, tests green, deployed, `HUB_ADDRESS` set | `forge test` green + address visible in explorer |
| **2 · Agent engines** | 1:30 – 3:00 | requester + worker + preflight working E2E in terminal | `demo:go` produces ≥ 3 paid tasks in terminal logs |
| **3 · Live frontend** | 2:00 – 5:00 *(starts early; ABI is already frozen)* | Dashboard rendering live chain data | UI shows tasks moving through states in real time |
| **4 · Integrate & rehearse** | 5:00 – 6:00 | Rehearsed 3-min demo, README, backup video | 3 consecutive clean dry-runs |

> **Parallelism tip:** If you can run two AI agents, run **Track A** (contract → agents) and **Track B** (frontend) at the same time. The ABI in `shared/abi.ts` (§3.1.5) is already fully specified, so Track B never waits on Track A. Any change to a function/event signature = edit `shared/abi.ts` → `npm run sync` → notify both tracks.

---

## 1. SYSTEM ARCHITECTURE & COMPONENT DIAGRAM

### 1.1 Component diagram

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
              OpenAI API  (or MOCK_LLM)
```

### 1.2 Task lifecycle (sequence)

```
Requester          A2AHub                 Worker (1 or 2)            OpenAI              UI
    │ createTask{0.005 MON}   │                  │                      │                 │
    │────────────────────────▶│ emit TaskCreated │                      │                 │
    │                         │─────────────────▶│ (poller sees event)  │                 │──▶ terminal: "TASK #7 posted"
    │                         │◀─ claimTask(7) ──│                      │                 │
    │                         │ emit TaskClaimed │                      │                 │──▶ graph pulse worker→hub
    │                         │                  │── prompt ───────────▶│                 │
    │                         │                  │◀── answer ───────────│                 │
    │                         │◀ submitResultAndPayout(7, answer) ──────│                 │
    │                         │ status=Completed; transfer reward → worker                │
    │                         │ emit TaskCompleted + PaymentReleased      │                 │──▶ terminal: "0.005 MON → Scribe ✓"
    │◀── (poller sees events) │                  │                      │                 │
```

### 1.3 State machine (on-chain, enforced by the contract)

```
            claimTask (worker ≠ requester, before deadline)        submitResultAndPayout (only claimant, before deadline)
 [Open] ──────────────────────────────────────────────▶ [Claimed] ───────────────────────────────────────────────▶ [Completed]
   │                                                        │
   └──────────── refundExpired (anyone, after deadline) ────┴──────────────────────────────▶ [Refunded]  (reward → requester)
```

### 1.4 Responsibilities & contracts between components

| Component | Owns | Reads | Writes | Must never |
|---|---|---|---|---|
| `A2AHub.sol` | Escrow, state machine, payout, agent stats | — | — | Hold funds after settlement; allow double payout |
| Requester agent | Task creation policy, budget guard, refund watchdog | Hub events, own balance | `registerAgent`, `createTask`, `refundExpired` | Exceed budget; post when balance < reserve |
| Worker agent | Capability filter, claim race handling, LLM call | Hub events, `tasks()` for catch-up | `registerAgent`, `claimTask`, `submitResultAndPayout` | Process own tasks; submit without claiming first |
| Dashboard | Presentation | Hub events + view calls (+ telemetry SSE) | *(P1: `createTask` via wallet)* | Hold private keys; trust anything off-chain as "truth" |

**Task prompt wire format (stored on-chain in `prompt`):** `TYPE|payload` — e.g. `SUMMARIZE|Monad is an EVM-compatible…`. `TYPE ∈ {SUMMARIZE, SENTIMENT, TRANSLATE_ES, CODE_REVIEW}`. This gives natural *capability routing* between workers.

**Trust model (say this in the pitch):** MVP uses **optimistic instant payout** — the worker is paid on submission; the requester's protection is the *escrow + deadline + refund* and (roadmap) multi-worker verification and reputation-weighted claiming. This is intentional: the demo is about autonomous *machine-speed settlement*.

### 1.5 RPC rate-limit budget (public RPC ≈ 20–25 req/s per IP)
| Process | Calls / second (steady state) |
|---|---|
| Each agent poller (`getBlockNumber` + `getContractEvents`) | ~2 |
| Each agent tx flow (burst) | ~3–5 transient |
| Browser tab (`useHubFeed` poll + `useAgents` every 3 s) | ~3 |
| **Total with 3 agents + 1 tab** | **~12–15 → OK.** Do **not** open >3 dashboard tabs during the demo. |

If you ever see HTTP `429`: set `MONAD_RPC_URL`/`NEXT_PUBLIC_RPC_URL` to the backup RPC, or raise `POLL_INTERVAL_MS` to `1500`.

---
## 2. PROJECT DIRECTORY & FILE STRUCTURE

```
autonome/
├── plan.md                         # this file (keep in repo root; point your AI agent at it)
├── README.md                       # submission README (Phase 4)
├── .env                            # SECRETS — gitignored (copy from .env.example)
├── .env.example                    # committed template
├── .gitignore
├── package.json                    # root orchestration scripts (concurrently)
│
├── shared/                         # ★ SINGLE SOURCE OF TRUTH (edit only here)
│   ├── abi.ts                      #   viem parseAbi of A2AHub (frozen interface)
│   └── chain.ts                    #   monadTestnet chain def + explorer URL helpers
│
├── scripts/
│   ├── sync-shared.sh              # copies shared/* → agents/src/shared + web/src/lib/shared
│   └── deploy.sh                   # sources .env, runs forge script, prints HUB address
│
├── contracts/                      # Foundry project
│   ├── foundry.toml
│   ├── src/A2AHub.sol              # ★ the escrow + registry + payout contract
│   ├── test/A2AHub.t.sol           # unit + fuzz tests
│   ├── script/Deploy.s.sol         # deployment script
│   └── lib/forge-std/              # (installed by forge)
│
├── agents/                         # Node + TS autonomous agents
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── shared/                 # ← synced copy (DO NOT EDIT BY HAND)
│       │   ├── abi.ts
│       │   └── chain.ts
│       ├── env.ts                  # dotenv + typed env access
│       ├── util.ts                 # sleep, short(), clip(), shortErr()
│       ├── logger.ts               # colored console + optional telemetry POST
│       ├── clients.ts              # viem public client (Monad)
│       ├── tx.ts                   # per-agent wallet: serialized sends, nonce mgmt, gas preflight
│       ├── poller.ts               # bounded getLogs poller (≤ 99 blocks / call)
│       ├── task-protocol.ts        # TYPE|payload encode/parse + catalog + system prompts
│       ├── llm.ts                  # OpenAI call + MOCK fallback
│       ├── agent-requester.ts      # ★ Agent A
│       ├── agent-worker.ts         # ★ Agent B (run as instance 1 and 2)
│       ├── preflight.ts            # environment/readiness checker
│       ├── gen-wallets.ts          # prints fresh testnet keys as .env lines
│       └── fund-agents.ts          # deployer → requester/workers MON top-up
│
└── web/                            # Next.js 14 dashboard
    ├── package.json
    ├── tailwind.config.ts
    ├── .env.local                  # NEXT_PUBLIC_* (gitignored)
    ├── .env.local.example
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── globals.css
        │   ├── page.tsx            # composes the dashboard
        │   ├── providers.tsx       # (P1) wagmi + RainbowKit + react-query
        │   └── api/telemetry/route.ts   # (P1) SSE + POST for off-chain agent logs
        ├── lib/
        │   ├── shared/             # ← synced copy (DO NOT EDIT BY HAND)
        │   │   ├── abi.ts
        │   │   └── chain.ts
        │   ├── hub.ts              # publicClient + HUB address + types + reducer + hooks
        │   ├── format.ts           # fmtMon, shortAddr, describeLine(), relative time
        │   └── wagmi.ts            # (P1) wagmi config
        └── components/
            ├── Header.tsx
            ├── StatsBar.tsx
            ├── Terminal.tsx        # ★ live activity terminal
            ├── AgentGraph.tsx      # ★ SVG graph with animated pulses
            ├── TaskBoard.tsx
            ├── Leaderboard.tsx
            ├── TxLink.tsx
            ├── ThoughtStream.tsx   # (P1) merges SSE telemetry lines into terminal
            └── PostTaskPanel.tsx   # (P1) human-posts-a-task via wallet
```

**Ownership rules for AI agents**
- `shared/*` is edited **only** in `shared/`. After any edit run `npm run sync`.
- Never hand-edit `agents/src/shared/*` or `web/src/lib/shared/*`.
- Each file below is created by exactly one prompt in §4.3.

---

## 3. STEP-BY-STEP IMPLEMENTATION ROADMAP (CHRONOLOGICAL SPRINT)

---

### PHASE 0 — BOOTSTRAP (T+0:00 → T+0:30)

**Goal:** a repo where `forge`, `node`, wallets and env all work *before* any feature code.

#### 3.0.1 Prerequisites checklist
- [ ] Node.js **≥ 20** (`node -v`), npm ≥ 10
- [ ] Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup` → `forge --version`
- [ ] `jq` (optional, used by `deploy.sh`) and `git`
- [ ] OpenAI API key (or plan to run with `MOCK_LLM=true`)
- [ ] (P1) WalletConnect/Reown project ID (free) — *optional; injected wallets work without it*
- [ ] On Windows use **WSL2 or Git Bash** for the `.sh` scripts

#### 3.0.2 Scaffold commands (run exactly, in order)

```bash
# 1. repo root
mkdir autonome && cd autonome && git init
mkdir -p shared scripts

# 2. contracts (Foundry)
mkdir contracts && cd contracts
forge init --force .                 # scaffolds src/ test/ script/ lib/forge-std
rm -f src/Counter.sol test/Counter.t.sol script/Counter.s.sol
cd ..

# 3. agents
mkdir -p agents/src/shared && cd agents
npm init -y
npm i viem@2 openai@4 dotenv@16
npm i -D typescript@5 tsx@4 @types/node@20
cd ..

# 4. web (Next 14 — answer "No" to Turbopack/other prompts if asked)
npx create-next-app@14 web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd web
npm i viem@2 wagmi@2 @rainbow-me/rainbowkit@2 @tanstack/react-query@5 lucide-react
cd ..

# 5. root orchestration
npm init -y
npm i -D concurrently@9
```

> If `forge init` complains about git, run `git add -A && git commit -m init --allow-empty` at the repo root and retry. If `forge-std` is missing: `cd contracts && forge install foundry-rs/forge-std`.

#### 3.0.3 `.gitignore` (root)
```gitignore
node_modules
.env
.env.local
contracts/out
contracts/cache
contracts/broadcast
web/.next
*.log
.DS_Store
```

#### 3.0.4 `.env.example` (root) — copy to `.env`
```bash
# ───────── Network ─────────
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
# Backup: https://rpc-testnet.monadinfra.com   (20 rps, no batching)

# ───────── Wallets (TESTNET ONLY — never reuse real keys) ─────────
DEPLOYER_PRIVATE_KEY=0x
REQUESTER_PRIVATE_KEY=0x
WORKER_1_PRIVATE_KEY=0x
WORKER_2_PRIVATE_KEY=0x

# ───────── Agent identities ─────────
REQUESTER_NAME=Atlas
WORKER_1_NAME=Scribe
WORKER_1_CAPS=SUMMARIZE,TRANSLATE_ES,SENTIMENT
WORKER_2_NAME=Oracle
WORKER_2_CAPS=SENTIMENT,CODE_REVIEW

# ───────── Contract ─────────
HUB_ADDRESS=0x

# ───────── LLM ─────────
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini        # change if your account/model list differs
MOCK_LLM=false                  # true = deterministic canned answers (demo safety net)

# ───────── Tuning ─────────
TASK_TTL_SECONDS=300
POLL_INTERVAL_MS=1000
WORKER_MIN_REWARD_MON=0.002
LOOP_INTERVAL_MS=6000
TELEMETRY_URL=http://localhost:3000/api/telemetry
```

#### 3.0.5 `web/.env.local.example`
```bash
NEXT_PUBLIC_HUB_ADDRESS=0x
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

#### 3.0.6 Wallet creation & funding
1. Create `agents/src/gen-wallets.ts` (code in §3.2.9) and run `cd agents && npx tsx src/gen-wallets.ts` → paste the four key lines into `.env`.
2. Fund the **deployer** at `https://faucet.monad.xyz` (paste its address, printed by `preflight`/`gen-wallets`).
3. After `fund-agents.ts` exists (§3.2.10): `cd agents && npx tsx src/fund-agents.ts` distributes MON from deployer → requester (1 MON) and workers (0.3 MON each). *If the faucet is rate-limited per address this avoids needing 4 faucet claims.*
4. **Minimum balances for the demo:** requester ≥ 0.5 MON, each worker ≥ 0.1 MON, deployer ≥ 0.1 MON.

#### 3.0.7 Root `package.json` scripts (replace the `scripts` block)
```json
{
  "name": "autonome",
  "private": true,
  "scripts": {
    "sync": "bash scripts/sync-shared.sh",
    "contracts:test": "cd contracts && forge test -vv",
    "contracts:deploy": "bash scripts/deploy.sh",
    "preflight": "npm --prefix agents run preflight",
    "demo:up": "concurrently -k -n WEB,W1,W2 -c magenta,green,yellow \"npm --prefix web run dev\" \"npm --prefix agents run worker -- 1\" \"npm --prefix agents run worker -- 2\"",
    "demo:go": "npm --prefix agents run requester -- burst 5",
    "demo:auto": "npm --prefix agents run requester -- loop"
  },
  "devDependencies": { "concurrently": "^9.0.0" }
}
```
*(Keep whatever `devDependencies` version `npm i -D concurrently@9` wrote; only the `scripts` block must match.)*

#### 3.0.8 `scripts/sync-shared.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/agents/src/shared" "$ROOT/web/src/lib/shared"
cp "$ROOT/shared/abi.ts" "$ROOT/shared/chain.ts" "$ROOT/agents/src/shared/"
cp "$ROOT/shared/abi.ts" "$ROOT/shared/chain.ts" "$ROOT/web/src/lib/shared/"
echo "✔ shared files synced → agents + web"
```

#### 3.0.9 `scripts/deploy.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a; source "$ROOT/.env"; set +a
cd "$ROOT/contracts"
forge script script/Deploy.s.sol:Deploy --rpc-url "$MONAD_RPC_URL" --broadcast -vvv

RUN="broadcast/Deploy.s.sol/10143/run-latest.json"
if command -v jq >/dev/null 2>&1 && [ -f "$RUN" ]; then
  ADDR=$(jq -r '[.transactions[] | select(.contractName=="A2AHub")][0].contractAddress' "$RUN")
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo " A2AHub deployed at: $ADDR"
  echo " → set HUB_ADDRESS=$ADDR in .env"
  echo " → set NEXT_PUBLIC_HUB_ADDRESS=$ADDR in web/.env.local"
  echo " → explorer: https://testnet.monadvision.com/address/$ADDR"
  echo "════════════════════════════════════════════════════════"
else
  echo "Copy the 'A2AHub deployed at:' address from the log above into .env and web/.env.local"
fi
```

**✅ Phase 0 gate:** `forge --version` OK · `node -v` ≥ 20 · `.env` has 4 keys · deployer has MON · `git commit -m "phase0: scaffold"`.

---
### PHASE 1 — SMART CONTRACT: `A2AHub.sol` (T+0:30 → T+1:30)

**Goal:** a minimal, audited-by-tests escrow + registry + instant-payout contract, deployed to Monad Testnet.

#### 3.1.1 Specification

**Data structures**
| Struct / Enum | Fields (in this exact order — the public getter's tuple order depends on it) |
|---|---|
| `enum Status` | `Open(0)`, `Claimed(1)`, `Completed(2)`, `Refunded(3)` |
| `struct Task` | `uint256 id` · `address requester` · `address worker` · `uint256 reward` · `uint64 createdAt` · `uint64 deadline` · `Status status` · `string prompt` · `string result` |
| `struct AgentProfile` | `string name` · `string role` · `uint256 tasksPosted` · `uint256 tasksCompleted` · `uint256 totalEarned` · `uint256 totalSpent` |

**State variables:** `uint256 public taskCount` · `mapping(uint256=>Task) public tasks` · `mapping(address=>AgentProfile) public agents` · private agent index (`address[]`) · reentrancy lock.
Task IDs start at **1** (0 = "no task").

**Events (frozen)**
```
AgentRegistered(address indexed agent, string name, string role)
TaskCreated(uint256 indexed taskId, address indexed requester, uint256 reward, uint64 deadline, string prompt)
TaskClaimed(uint256 indexed taskId, address indexed worker)
TaskCompleted(uint256 indexed taskId, address indexed worker, string result)
PaymentReleased(uint256 indexed taskId, address indexed worker, uint256 amount)
TaskRefunded(uint256 indexed taskId, address indexed requester, uint256 amount)
```

**Functions & rules**
| Function | Who | Rules (revert strings are part of the spec — tests assert them) |
|---|---|---|
| `registerAgent(string name, string role)` | anyone | name 1–32 bytes (`"bad name"`), role ≤ 32 bytes (`"bad role"`); idempotent upsert |
| `createTask(string prompt, uint64 ttl) payable returns (uint256)` | anyone | `msg.value > 0` (`"reward=0"`); prompt 1–1024 bytes (`"bad prompt"`); `30 ≤ ttl ≤ 86400` (`"bad ttl"`); locks `msg.value` |
| `claimTask(uint256 id)` | anyone ≠ requester | exists (`"no task"`); status Open (`"not open"`); before deadline (`"expired"`); not requester (`"self-claim"`) |
| `submitResultAndPayout(uint256 id, string result)` | claimant only | status Claimed (`"not claimed"`); `msg.sender == worker` (`"not worker"`); before deadline (`"expired"`); result 1–2048 bytes (`"bad result"`); **pays `reward` to worker in the same tx** (`"payout failed"` if transfer fails) |
| `refundExpired(uint256 id)` | **anyone** | exists (`"no task"`); status Open or Claimed (`"settled"`); `block.timestamp > deadline` (`"not expired"`); returns reward to **requester** |
| `getAgents()` view | anyone | returns all addresses that ever registered/created/claimed |

**Security invariants (all covered by tests):** checks-effects-interactions; `nonReentrant` on both ETH-sending functions; status flips *before* any transfer; contract balance after settlement never retains settled rewards; no `receive()`/`fallback()` (stray ETH rejected).

#### 3.1.2 `contracts/foundry.toml`
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
monad_testnet = "https://testnet-rpc.monad.xyz"
```
> If deployment ever fails with an *invalid opcode* error, try `evm_version = "prague"` (Monad supports it) — but start with `cancun`.

#### 3.1.3 `contracts/src/A2AHub.sol`  *(copy verbatim)*
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title A2AHub — escrow, task registry and instant payout rail for autonomous agents (Autonome)
/// @notice Requesters lock native MON; a worker claims, submits a result, and is paid in the same tx.
contract A2AHub {
    // ───────────────────────── Types ─────────────────────────
    enum Status { Open, Claimed, Completed, Refunded }

    struct Task {
        uint256 id;
        address requester;
        address worker;
        uint256 reward;
        uint64  createdAt;
        uint64  deadline;
        Status  status;
        string  prompt;
        string  result;
    }

    struct AgentProfile {
        string  name;
        string  role;
        uint256 tasksPosted;
        uint256 tasksCompleted;
        uint256 totalEarned;
        uint256 totalSpent;
    }

    // ───────────────────────── Constants ─────────────────────────
    uint256 public constant MAX_PROMPT_BYTES = 1024;
    uint256 public constant MAX_RESULT_BYTES = 2048;
    uint64  public constant MIN_TTL = 30;
    uint64  public constant MAX_TTL = 1 days;

    // ───────────────────────── Storage ─────────────────────────
    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    mapping(address => AgentProfile) public agents;

    mapping(address => bool) private _known;
    address[] private _agentList;
    uint256 private _lock = 1;

    // ───────────────────────── Events ─────────────────────────
    event AgentRegistered(address indexed agent, string name, string role);
    event TaskCreated(uint256 indexed taskId, address indexed requester, uint256 reward, uint64 deadline, string prompt);
    event TaskClaimed(uint256 indexed taskId, address indexed worker);
    event TaskCompleted(uint256 indexed taskId, address indexed worker, string result);
    event PaymentReleased(uint256 indexed taskId, address indexed worker, uint256 amount);
    event TaskRefunded(uint256 indexed taskId, address indexed requester, uint256 amount);

    // ───────────────────────── Modifiers ─────────────────────────
    modifier nonReentrant() {
        require(_lock == 1, "reentrancy");
        _lock = 2;
        _;
        _lock = 1;
    }

    // ───────────────────────── Agent registry ─────────────────────────
    function registerAgent(string calldata name, string calldata role) external {
        uint256 n = bytes(name).length;
        require(n > 0 && n <= 32, "bad name");
        require(bytes(role).length <= 32, "bad role");
        _touch(msg.sender);
        agents[msg.sender].name = name;
        agents[msg.sender].role = role;
        emit AgentRegistered(msg.sender, name, role);
    }

    function getAgents() external view returns (address[] memory) {
        return _agentList;
    }

    // ───────────────────────── Core lifecycle ─────────────────────────
    /// @notice Post a task and lock `msg.value` as the reward.
    /// @param prompt  Wire format "TYPE|payload" (see plan.md §1.4)
    /// @param ttl     Seconds until the task expires (30..86400)
    function createTask(string calldata prompt, uint64 ttl) external payable returns (uint256 taskId) {
        require(msg.value > 0, "reward=0");
        uint256 len = bytes(prompt).length;
        require(len > 0 && len <= MAX_PROMPT_BYTES, "bad prompt");
        require(ttl >= MIN_TTL && ttl <= MAX_TTL, "bad ttl");

        taskId = ++taskCount;
        uint64 nowTs = uint64(block.timestamp);
        uint64 deadline = nowTs + ttl;

        // Field-by-field writes (avoids "stack too deep" from a 9-field struct literal)
        Task storage t = tasks[taskId];
        t.id = taskId;
        t.requester = msg.sender;
        t.reward = msg.value;
        t.createdAt = nowTs;
        t.deadline = deadline;
        t.status = Status.Open;
        t.prompt = prompt;

        _touch(msg.sender);
        AgentProfile storage p = agents[msg.sender];
        p.tasksPosted += 1;
        p.totalSpent += msg.value;

        emit TaskCreated(taskId, msg.sender, msg.value, deadline, prompt);
    }

    /// @notice First valid caller wins the task. Losers revert with "not open".
    function claimTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(t.id != 0, "no task");
        require(t.status == Status.Open, "not open");
        require(block.timestamp <= t.deadline, "expired");
        require(msg.sender != t.requester, "self-claim");

        t.worker = msg.sender;
        t.status = Status.Claimed;
        _touch(msg.sender);

        emit TaskClaimed(taskId, msg.sender);
    }

    /// @notice Claimant submits the result and is paid the escrowed reward in the same transaction.
    function submitResultAndPayout(uint256 taskId, string calldata result) external nonReentrant {
        Task storage t = tasks[taskId];
        require(t.status == Status.Claimed, "not claimed");
        require(msg.sender == t.worker, "not worker");
        require(block.timestamp <= t.deadline, "expired");
        uint256 len = bytes(result).length;
        require(len > 0 && len <= MAX_RESULT_BYTES, "bad result");

        uint256 amount = t.reward;

        // effects
        t.status = Status.Completed;
        t.result = result;
        AgentProfile storage p = agents[msg.sender];
        p.tasksCompleted += 1;
        p.totalEarned += amount;

        emit TaskCompleted(taskId, msg.sender, result);

        // interaction
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "payout failed");

        emit PaymentReleased(taskId, msg.sender, amount);
    }

    /// @notice Anyone can trigger a refund once a task is past its deadline and unsettled.
    function refundExpired(uint256 taskId) external nonReentrant {
        Task storage t = tasks[taskId];
        require(t.id != 0, "no task");
        require(t.status == Status.Open || t.status == Status.Claimed, "settled");
        require(block.timestamp > t.deadline, "not expired");

        address requester = t.requester;
        uint256 amount = t.reward;

        // effects
        t.status = Status.Refunded;
        agents[requester].totalSpent -= amount;

        emit TaskRefunded(taskId, requester, amount);

        // interaction
        (bool ok, ) = payable(requester).call{value: amount}("");
        require(ok, "refund failed");
    }

    // ───────────────────────── Internal ─────────────────────────
    function _touch(address a) internal {
        if (!_known[a]) {
            _known[a] = true;
            _agentList.push(a);
        }
    }
}
```

#### 3.1.4 `contracts/test/A2AHub.t.sol`  *(copy verbatim — all must pass)*
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {A2AHub} from "../src/A2AHub.sol";

contract A2AHubTest is Test {
    A2AHub hub;
    address requester = makeAddr("requester");
    address worker    = makeAddr("worker");
    address worker2   = makeAddr("worker2");

    function setUp() public {
        hub = new A2AHub();
        vm.deal(requester, 10 ether);
    }

    // ───── helpers ─────
    function _create(uint256 reward) internal returns (uint256 id) {
        vm.prank(requester);
        id = hub.createTask{value: reward}("SUMMARIZE|hello world", 300);
    }

    function _status(uint256 id) internal view returns (A2AHub.Status s) {
        (, , , , , , s, , ) = hub.tasks(id);
    }

    // ───── happy path ─────
    function test_HappyPath() public {
        uint256 id = _create(1 ether);
        assertEq(id, 1);
        assertEq(address(hub).balance, 1 ether);
        assertEq(uint8(_status(id)), uint8(A2AHub.Status.Open));

        vm.prank(worker);
        hub.claimTask(id);
        assertEq(uint8(_status(id)), uint8(A2AHub.Status.Claimed));

        uint256 before = worker.balance;
        vm.prank(worker);
        hub.submitResultAndPayout(id, "done");

        assertEq(worker.balance - before, 1 ether);
        assertEq(address(hub).balance, 0);
        assertEq(uint8(_status(id)), uint8(A2AHub.Status.Completed));

        (, , , , , , , , string memory result) = hub.tasks(id);
        assertEq(result, "done");
    }

    function test_EmitsEvents() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);

        vm.expectEmit(true, true, false, true, address(hub));
        emit A2AHub.TaskCompleted(id, worker, "done");
        vm.expectEmit(true, true, false, true, address(hub));
        emit A2AHub.PaymentReleased(id, worker, 1 ether);

        vm.prank(worker);
        hub.submitResultAndPayout(id, "done");
    }

    function test_AgentStats() public {
        uint256 id = _create(2 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker);
        hub.submitResultAndPayout(id, "ok");

        (, , uint256 posted, , , uint256 spent) = hub.agents(requester);
        assertEq(posted, 1);
        assertEq(spent, 2 ether);

        (, , , uint256 completed, uint256 earned, ) = hub.agents(worker);
        assertEq(completed, 1);
        assertEq(earned, 2 ether);

        assertEq(hub.getAgents().length, 2);
    }

    function test_RegisterAgent() public {
        vm.prank(worker);
        hub.registerAgent("Scribe", "worker");
        (string memory n, string memory r, , , , ) = hub.agents(worker);
        assertEq(n, "Scribe");
        assertEq(r, "worker");
        vm.prank(worker);
        vm.expectRevert(bytes("bad name"));
        hub.registerAgent("", "worker");
    }

    // ───── claim rules ─────
    function test_CannotClaimTwice() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker2);
        vm.expectRevert(bytes("not open"));
        hub.claimTask(id);
    }

    function test_RequesterCannotSelfClaim() public {
        uint256 id = _create(1 ether);
        vm.prank(requester);
        vm.expectRevert(bytes("self-claim"));
        hub.claimTask(id);
    }

    function test_CannotClaimMissingTask() public {
        vm.prank(worker);
        vm.expectRevert(bytes("no task"));
        hub.claimTask(999);
    }

    function test_CannotClaimExpired() public {
        uint256 id = _create(1 ether);
        vm.warp(block.timestamp + 301);
        vm.prank(worker);
        vm.expectRevert(bytes("expired"));
        hub.claimTask(id);
    }

    // ───── submit rules ─────
    function test_OnlyWorkerCanSubmit() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker2);
        vm.expectRevert(bytes("not worker"));
        hub.submitResultAndPayout(id, "stolen");
    }

    function test_CannotSubmitUnclaimed() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        vm.expectRevert(bytes("not claimed"));
        hub.submitResultAndPayout(id, "x");
    }

    function test_CannotSubmitAfterDeadline() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.warp(block.timestamp + 301);
        vm.prank(worker);
        vm.expectRevert(bytes("expired"));
        hub.submitResultAndPayout(id, "late");
    }

    function test_CannotDoublePay() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker);
        hub.submitResultAndPayout(id, "first");
        vm.prank(worker);
        vm.expectRevert(bytes("not claimed"));
        hub.submitResultAndPayout(id, "second");
    }

    // ───── create rules ─────
    function test_ZeroRewardReverts() public {
        vm.prank(requester);
        vm.expectRevert(bytes("reward=0"));
        hub.createTask{value: 0}("SUMMARIZE|x", 300);
    }

    function test_BadTtlReverts() public {
        vm.prank(requester);
        vm.expectRevert(bytes("bad ttl"));
        hub.createTask{value: 1 ether}("SUMMARIZE|x", 5);
    }

    function test_EmptyPromptReverts() public {
        vm.prank(requester);
        vm.expectRevert(bytes("bad prompt"));
        hub.createTask{value: 1 ether}("", 300);
    }

    // ───── refunds ─────
    function test_RefundAfterExpiry_Open() public {
        uint256 id = _create(1 ether);
        assertEq(requester.balance, 9 ether);
        vm.warp(block.timestamp + 301);
        vm.prank(worker2); // anyone can trigger
        hub.refundExpired(id);
        assertEq(requester.balance, 10 ether);
        assertEq(address(hub).balance, 0);
        assertEq(uint8(_status(id)), uint8(A2AHub.Status.Refunded));
        (, , uint256 posted, , , uint256 spent) = hub.agents(requester);
        assertEq(posted, 1);
        assertEq(spent, 0);
    }

    function test_RefundAfterExpiry_Claimed() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.warp(block.timestamp + 301);
        hub.refundExpired(id);
        assertEq(requester.balance, 10 ether);
    }

    function test_CannotRefundBeforeExpiry() public {
        uint256 id = _create(1 ether);
        vm.expectRevert(bytes("not expired"));
        hub.refundExpired(id);
    }

    function test_CannotRefundCompleted() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker);
        hub.submitResultAndPayout(id, "ok");
        vm.warp(block.timestamp + 301);
        vm.expectRevert(bytes("settled"));
        hub.refundExpired(id);
    }

    // ───── no stray ETH ─────
    function test_RejectsStrayEth() public {
        (bool ok, ) = address(hub).call{value: 1 ether}("");
        assertFalse(ok);
    }

    // ───── fuzz: value conservation ─────
    function testFuzz_ConservesValue(uint96 rewardRaw) public {
        uint256 reward = bound(uint256(rewardRaw), 1, 5 ether);
        uint256 id = _create(reward);
        vm.prank(worker);
        hub.claimTask(id);
        uint256 before = worker.balance;
        vm.prank(worker);
        hub.submitResultAndPayout(id, "ok");
        assertEq(worker.balance - before, reward);
        assertEq(address(hub).balance, 0);
    }
}
```

#### 3.1.5 Shared interface files (the frozen ABI)  *(create in `shared/`, then `npm run sync`)*

**`shared/chain.ts`**
```ts
import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
      webSocket: ["wss://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://testnet.monadvision.com" },
  },
  testnet: true,
});

export const EXPLORER = "https://testnet.monadvision.com";
export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (addr: string) => `${EXPLORER}/address/${addr}`;
```

**`shared/abi.ts`**
```ts
import { parseAbi } from "viem";

/** Human-readable ABI of A2AHub.sol. MUST match contracts/src/A2AHub.sol exactly. */
export const a2aHubAbi = parseAbi([
  // ── events ──
  "event AgentRegistered(address indexed agent, string name, string role)",
  "event TaskCreated(uint256 indexed taskId, address indexed requester, uint256 reward, uint64 deadline, string prompt)",
  "event TaskClaimed(uint256 indexed taskId, address indexed worker)",
  "event TaskCompleted(uint256 indexed taskId, address indexed worker, string result)",
  "event PaymentReleased(uint256 indexed taskId, address indexed worker, uint256 amount)",
  "event TaskRefunded(uint256 indexed taskId, address indexed requester, uint256 amount)",

  // ── writes ──
  "function registerAgent(string name, string role)",
  "function createTask(string prompt, uint64 ttl) payable returns (uint256 taskId)",
  "function claimTask(uint256 taskId)",
  "function submitResultAndPayout(uint256 taskId, string result)",
  "function refundExpired(uint256 taskId)",

  // ── reads ──
  "function taskCount() view returns (uint256)",
  "function getAgents() view returns (address[])",
  "function tasks(uint256 taskId) view returns (uint256 id, address requester, address worker, uint256 reward, uint64 createdAt, uint64 deadline, uint8 status, string prompt, string result)",
  "function agents(address agent) view returns (string name, string role, uint256 tasksPosted, uint256 tasksCompleted, uint256 totalEarned, uint256 totalSpent)",
]);

export const TASK_STATUS = ["Open", "Claimed", "Completed", "Refunded"] as const;
export type TaskStatusName = (typeof TASK_STATUS)[number];
```

**Sanity check that ABI ↔ contract agree** (run after `forge build`):
```bash
cd contracts && forge inspect A2AHub methods     # compare function selectors/names with shared/abi.ts
forge inspect A2AHub events                      # compare event names/params
```

#### 3.1.6 `contracts/script/Deploy.s.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {A2AHub} from "../src/A2AHub.sol";

contract Deploy is Script {
    function run() external returns (A2AHub hub) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        hub = new A2AHub();
        vm.stopBroadcast();
        console.log("A2AHub deployed at:", address(hub));
    }
}
```

#### 3.1.7 Run order (exact commands)
```bash
npm run sync                      # copy shared/ files into agents + web
cd contracts
forge build
forge test -vv                    # ALL tests must pass before deploying
cd ..
npm run contracts:deploy          # prints the A2AHub address
# → paste into .env (HUB_ADDRESS) and web/.env.local (NEXT_PUBLIC_HUB_ADDRESS)
```
*(Optional verification, only if time remains — Monad docs list the Sourcify endpoint:)*
`forge verify-contract <ADDR> src/A2AHub.sol:A2AHub --chain 10143 --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org` — check docs.monad.xyz "Verify a contract" if it errors.

**✅ Phase 1 gate:** `forge test` 100 % green · contract address opens in the explorer · `HUB_ADDRESS` set in both env files · `git commit -m "phase1: A2AHub deployed"` and **tag** `v0-contract`.

---
### PHASE 2 — AUTONOMOUS AGENT ENGINES (T+1:30 → T+3:00)

**Goal:** two kinds of Node processes that run the entire economy with no human input: **Agent A (Requester)** and **Agent B (Worker ×2)**.

#### 3.2.0 Design rules (read before coding)
1. **All chain I/O goes through `tx.ts` (writes) and `poller.ts` (events).** No ad-hoc `watchContractEvent`, no `ethers`.
2. **Writes are serialized per wallet** (one in-flight *submit*, many in-flight *confirmations*) with a **local nonce counter** → bursts of 5+ txs don't collide on nonces.
3. **Pre-flight every write with `estimateContractGas`.** A would-be revert (e.g. `"not open"` after losing a claim race) is caught for free, with the revert reason, and costs no gas.
4. **Race losses are normal, not errors.** Two workers may both want task #N; the loser logs `lost race` and moves on.
5. **The demo must never stall:** LLM failure → automatic `[mock]` fallback; poller errors → log + retry; refund watchdog on the requester.
6. All amounts are `bigint` wei. Never `Number()` a wei value.

#### 3.2.1 `agents/package.json` (scripts + `"type"`)
```json
{
  "name": "autonome-agents",
  "private": true,
  "type": "module",
  "scripts": {
    "requester": "tsx src/agent-requester.ts",
    "worker": "tsx src/agent-worker.ts",
    "preflight": "tsx src/preflight.ts",
    "gen-wallets": "tsx src/gen-wallets.ts",
    "fund": "tsx src/fund-agents.ts",
    "typecheck": "tsc --noEmit"
  }
}
```
*(Keep the `dependencies`/`devDependencies` that `npm i` wrote.)*

#### 3.2.2 `agents/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

#### 3.2.3 Core infrastructure files

**`agents/src/env.ts`**
```ts
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../.env") }); // repo-root .env

const opt = (k: string, d: string): string => {
  const v = process.env[k];
  return v && v.length > 0 ? v : d;
};

export const need = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env var: ${k} (see .env.example)`);
  return v;
};

export const hexEnv = (k: string): `0x${string}` => {
  const v = need(k);
  if (!/^0x[0-9a-fA-F]+$/.test(v) || v.length < 4) throw new Error(`${k} must be 0x-prefixed hex`);
  return v as `0x${string}`;
};

export const env = {
  rpcUrl: opt("MONAD_RPC_URL", "https://testnet-rpc.monad.xyz"),
  pollMs: Number(opt("POLL_INTERVAL_MS", "1000")),
  loopMs: Number(opt("LOOP_INTERVAL_MS", "6000")),
  ttl: BigInt(opt("TASK_TTL_SECONDS", "300")),
  mockLlm: opt("MOCK_LLM", "false") === "true",
  openaiModel: opt("OPENAI_MODEL", "gpt-4o-mini"),
  minRewardMon: opt("WORKER_MIN_REWARD_MON", "0.002"),
  get hub(): `0x${string}` {
    return hexEnv("HUB_ADDRESS");
  },
};
```

**`agents/src/util.ts`**
```ts
import { formatEther } from "viem";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const mon = (wei: bigint) => `${formatEther(wei)} MON`;
export const clip = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** One-line, human-readable error (viem errors expose `shortMessage`). */
export function shortErr(e: unknown): string {
  const x = e as { shortMessage?: string; message?: string };
  return (x.shortMessage ?? x.message ?? String(e)).split("\n")[0].slice(0, 180);
}
```

**`agents/src/logger.ts`**
```ts
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
```

**`agents/src/clients.ts`**
```ts
import { createPublicClient, http } from "viem";
import { monadTestnet } from "./shared/chain";
import { env } from "./env";

/** pollingInterval 500ms: Monad blocks are ~400ms; viem's 4000ms default would make everything feel slow. */
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(env.rpcUrl, { retryCount: 4, retryDelay: 250 }),
  pollingInterval: 500,
});
```

**`agents/src/tx.ts`** — *the most important infrastructure file*
```ts
import { createWalletClient, http, type Abi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./shared/chain";
import { a2aHubAbi } from "./shared/abi";
import { publicClient } from "./clients";
import { env } from "./env";

const abi: Abi = a2aHubAbi; // widened so functionName/args can be dynamic strings

export type HubWriteName =
  | "registerAgent"
  | "createTask"
  | "claimTask"
  | "submitResultAndPayout"
  | "refundExpired";

export function makeAgentWallet(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(env.rpcUrl, { retryCount: 4, retryDelay: 250 }),
  });

  let nextNonce: number | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  async function acquireNonce(): Promise<number> {
    if (nextNonce === null) {
      nextNonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "latest" });
    }
    return nextNonce++;
  }

  /**
   * Submit a hub write. Calls are queued so nonces are assigned in call order.
   * Resolves with the tx hash as soon as the node accepts it (does NOT wait for the receipt).
   */
  function send(functionName: HubWriteName, args: readonly unknown[], value?: bigint): Promise<Hex> {
    const job = queue.then(async () => {
      // Pre-flight: a revert here costs nothing and carries the revert reason.
      const gas = await publicClient.estimateContractGas({
        abi,
        address: env.hub,
        functionName,
        args,
        account,
        value,
      });
      const nonce = await acquireNonce();
      try {
        return await walletClient.writeContract({
          abi,
          address: env.hub,
          functionName,
          args,
          value,
          account,
          chain: monadTestnet,
          nonce,
          gas: (gas * 12n) / 10n, // +20% buffer (Monad charges on gas LIMIT, so keep it tight)
        });
      } catch (e) {
        nextNonce = null; // resync from chain on next call
        throw e;
      }
    });
    queue = job.catch(() => undefined); // a failed job must not poison the queue
    return job;
  }

  /** send() + wait for the receipt. Throws if the tx reverted on-chain. */
  async function sendAndWait(functionName: HubWriteName, args: readonly unknown[], value?: bigint) {
    const hash = await send(functionName, args, value);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 });
    if (receipt.status !== "success") throw new Error(`tx reverted on-chain: ${hash}`);
    return { hash, receipt };
  }

  return { account, walletClient, send, sendAndWait };
}
export type AgentWallet = ReturnType<typeof makeAgentWallet>;
```

**`agents/src/poller.ts`**
```ts
import { publicClient } from "./clients";
import { a2aHubAbi } from "./shared/abi";
import { env } from "./env";
import { sleep } from "./util";

const MAX_RANGE = 99n; // public RPC getLogs range limit is small (~100 blocks)

async function fetchEvents(fromBlock: bigint, toBlock: bigint) {
  return publicClient.getContractEvents({
    abi: a2aHubAbi,
    address: env.hub,
    fromBlock,
    toBlock,
    strict: true, // typed, fully-populated args; undecodable logs are dropped
  });
}
export type HubEvent = Awaited<ReturnType<typeof fetchEvents>>[number];

/**
 * Bounded polling loop over A2AHub events. Starts at the current head (or `startBlock`),
 * never rescans a block, never requests >99 blocks per call.
 * `onEvent` is fire-and-forget so slow handlers (LLM calls) never block event ingestion.
 */
export async function pollHubEvents(
  onEvent: (e: HubEvent) => void | Promise<void>,
  opts: { startBlock?: bigint; intervalMs?: number } = {},
): Promise<never> {
  let cursor = opts.startBlock ?? (await publicClient.getBlockNumber({ cacheTime: 0 }));
  const interval = opts.intervalMs ?? env.pollMs;

  for (;;) {
    try {
      const head = await publicClient.getBlockNumber({ cacheTime: 0 });
      while (cursor <= head) {
        const to = cursor + MAX_RANGE < head ? cursor + MAX_RANGE : head;
        const logs = await fetchEvents(cursor, to);
        for (const log of logs) {
          void Promise.resolve(onEvent(log)).catch((err) => console.error("[poller] handler error:", err));
        }
        cursor = to + 1n;
      }
    } catch (err) {
      console.error("[poller] error (will retry):", (err as Error).message?.split("\n")[0]);
    }
    await sleep(interval);
  }
}
```

**`agents/src/task-protocol.ts`**
```ts
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
```

**`agents/src/llm.ts`**
```ts
import OpenAI from "openai";
import { env } from "./env";
import { SYSTEM_PROMPTS, type TaskType } from "./task-protocol";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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
```

#### 3.2.4 `agents/src/agent-requester.ts` — **Agent A**

**Behavior spec**
- CLI: `requester [mode] [count]` where `mode ∈ loop | burst | once` (default `loop`), `count` default `5` (burst only).
- On start: print address + balance; warn if low; `registerAgent(REQUESTER_NAME, "requester")` if not registered.
- Starts an event poller that logs claims/results/payments **for its own tasks only** and tracks settlement.
- **`once`**: post 1 task, wait until settled (≤ 90 s), exit.
- **`burst N`**: post N tasks **concurrently** (sends are queued → consecutive nonces → confirmations in parallel), wait until all settled (≤ 120 s), print summary, exit. *This is the Monad "parallel economy" moment.*
- **`loop`**: post one task every `LOOP_INTERVAL_MS` forever; stop posting if balance < `reward + 0.05 MON`.
- **Refund watchdog:** every 5 s, any own unsettled task past its deadline → `refundExpired`.

```ts
import { formatEther, parseEther } from "viem";
import { env, hexEnv } from "./env";
import { publicClient } from "./clients";
import { makeAgentWallet } from "./tx";
import { makeLogger, COLORS } from "./logger";
import { a2aHubAbi } from "./shared/abi";
import { txUrl } from "./shared/chain";
import { pollHubEvents } from "./poller";
import { CATALOG, encodePrompt } from "./task-protocol";
import { sleep, short, mon, clip, shortErr } from "./util";

const NAME = process.env.REQUESTER_NAME ?? "Atlas";
const log = makeLogger(NAME.toUpperCase(), COLORS.cyan);
const mode = (process.argv[2] ?? "loop") as "loop" | "burst" | "once";
const count = Number(process.argv[3] ?? "5");
const GAS_RESERVE = parseEther("0.05");

type Mine = { deadline: bigint; settled: boolean; reward: bigint };
const mine = new Map<bigint, Mine>();
let paidTotal = 0n;
let postedCount = 0;
let cursor = 0; // rotates through CATALOG

async function main() {
  const { account, sendAndWait } = makeAgentWallet(hexEnv("REQUESTER_PRIVATE_KEY"));
  const me = account.address.toLowerCase();

  const bal = await publicClient.getBalance({ address: account.address });
  log.info(`online as ${account.address} · balance ${formatEther(bal)} MON · mode=${mode}`);
  if (bal < parseEther("0.1")) log.warn("low balance — fund via https://faucet.monad.xyz or `npm run fund`");

  // 1) register identity (idempotent)
  const profile = await publicClient.readContract({
    address: env.hub, abi: a2aHubAbi, functionName: "agents", args: [account.address],
  });
  if (profile[0] === "") {
    const { hash } = await sendAndWait("registerAgent", [NAME, "requester"]);
    log.ok(`registered as "${NAME}" · ${txUrl(hash)}`);
  }

  // 2) watch events for my tasks
  void pollHubEvents((e) => {
    switch (e.eventName) {
      case "TaskCreated":
        if (e.args.requester.toLowerCase() === me)
          mine.set(e.args.taskId, { deadline: e.args.deadline, settled: false, reward: e.args.reward });
        break;
      case "TaskClaimed":
        if (mine.has(e.args.taskId)) log.info(`task #${e.args.taskId} claimed by ${short(e.args.worker)}`);
        break;
      case "TaskCompleted":
        if (mine.has(e.args.taskId)) log.ok(`task #${e.args.taskId} result ← "${clip(e.args.result)}"`);
        break;
      case "PaymentReleased": {
        const m = mine.get(e.args.taskId);
        if (m && !m.settled) {
          m.settled = true;
          paidTotal += e.args.amount;
          log.ok(`paid ${mon(e.args.amount)} → ${short(e.args.worker)} · task #${e.args.taskId} · ${txUrl(e.transactionHash)}`);
        }
        break;
      }
      case "TaskRefunded": {
        const m = mine.get(e.args.taskId);
        if (m) { m.settled = true; log.warn(`task #${e.args.taskId} refunded (${mon(e.args.amount)})`); }
        break;
      }
    }
  });

  // 3) refund watchdog
  setInterval(async () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    for (const [id, m] of mine) {
      if (m.settled || now <= m.deadline + 2n) continue;
      m.settled = true; // optimistic; avoid duplicate attempts
      try {
        const { hash } = await sendAndWait("refundExpired", [id]);
        log.warn(`refunded expired task #${id} · ${txUrl(hash)}`);
      } catch (e) {
        log.info(`refund #${id} skipped: ${shortErr(e)}`);
      }
    }
  }, 5000);

  // 4) posting
  async function postTask(): Promise<void> {
    const spec = CATALOG[cursor++ % CATALOG.length];
    const reward = parseEther(spec.rewardMon);
    log.info(`posting ${spec.type} · locking ${spec.rewardMon} MON…`);
    try {
      const { hash } = await sendAndWait("createTask", [encodePrompt(spec.type, spec.payload), env.ttl], reward);
      postedCount++;
      log.ok(`task posted (${spec.type}) · ${txUrl(hash)}`);
    } catch (e) {
      log.error(`post failed: ${shortErr(e)}`);
    }
  }

  const allSettled = () => postedCount > 0 && mine.size >= postedCount && [...mine.values()].every((m) => m.settled);
  async function waitSettled(maxMs: number) {
    const t0 = Date.now();
    while (!allSettled() && Date.now() - t0 < maxMs) await sleep(500);
  }
  const summary = () =>
    log.ok(`SUMMARY · posted=${postedCount} settled=${[...mine.values()].filter((m) => m.settled).length} paid=${mon(paidTotal)}`);

  if (mode === "once") {
    await postTask();
    await waitSettled(90_000);
    summary();
    process.exit(0);
  } else if (mode === "burst") {
    log.info(`BURST: firing ${count} tasks concurrently…`);
    await Promise.all(Array.from({ length: count }, () => postTask()));
    await waitSettled(120_000);
    summary();
    process.exit(0);
  } else {
    for (;;) {
      const b = await publicClient.getBalance({ address: account.address });
      if (b < parseEther("0.01") + GAS_RESERVE) {
        log.warn("budget exhausted — pausing posts (fund me!)");
        await sleep(10_000);
        continue;
      }
      await postTask();
      await sleep(env.loopMs);
    }
  }
}

main().catch((e) => {
  log.error(`fatal: ${shortErr(e)}`);
  process.exit(1);
});
```

> **Burst note:** `Promise.all([postTask() × N])` calls `sendAndWait` synchronously N times → `send()` enqueues N jobs in order → consecutive nonces. All N receipts are then awaited **in parallel**. Do not "optimize" this into sequential awaits.

#### 3.2.5 `agents/src/agent-worker.ts` — **Agent B** (run as instance `1` and `2`)

**Behavior spec**
- CLI: `worker <id>` (default `1`). Reads `WORKER_<id>_PRIVATE_KEY`, `WORKER_<id>_NAME`, `WORKER_<id>_CAPS`.
- On start: print identity/balance, register as `role="worker"`, start poller **first**, then run a **catch-up scan** of the last ≤ 15 tasks for any still `Open` (handles restarts mid-demo).
- On every `TaskCreated`: skip own tasks, unparseable prompts, types outside `CAPS`, rewards < `WORKER_MIN_REWARD_MON` (rational-agent filter), tasks with < 20 s left. Dedupe by task ID.
- Pipeline per task: `claimTask` → (lost race? log + stop) → LLM → `submitResultAndPayout` → log earnings + new balance.
- Max 2 tasks in flight per worker.

```ts
import { formatEther, parseEther } from "viem";
import { env, hexEnv } from "./env";
import { publicClient } from "./clients";
import { makeAgentWallet } from "./tx";
import { makeLogger, COLORS } from "./logger";
import { a2aHubAbi } from "./shared/abi";
import { txUrl } from "./shared/chain";
import { pollHubEvents } from "./poller";
import { ALL_TYPES, parsePrompt, type TaskType } from "./task-protocol";
import { runTask } from "./llm";
import { sleep, mon, clip, shortErr } from "./util";

const id = process.argv[2] ?? "1";
const NAME = process.env[`WORKER_${id}_NAME`] ?? `Worker-${id}`;
const CAPS = (process.env[`WORKER_${id}_CAPS`] ?? ALL_TYPES.join(","))
  .split(",").map((s) => s.trim()).filter(Boolean) as TaskType[];
const log = makeLogger(NAME.toUpperCase(), id === "1" ? COLORS.green : COLORS.yellow);

const MAX_IN_FLIGHT = 2;
const MIN_REWARD = parseEther(env.minRewardMon);
const seen = new Set<string>();
let inFlight = 0;

async function main() {
  const { account, sendAndWait } = makeAgentWallet(hexEnv(`WORKER_${id}_PRIVATE_KEY`));
  const me = account.address.toLowerCase();

  const bal = await publicClient.getBalance({ address: account.address });
  log.info(`online as ${account.address} · balance ${formatEther(bal)} MON · caps=[${CAPS.join(",")}]`);
  if (bal < parseEther("0.02")) log.warn("low balance — need a little MON for gas (`npm run fund`)");

  const profile = await publicClient.readContract({
    address: env.hub, abi: a2aHubAbi, functionName: "agents", args: [account.address],
  });
  if (profile[0] === "") {
    const { hash } = await sendAndWait("registerAgent", [NAME, "worker"]);
    log.ok(`registered as "${NAME}" · ${txUrl(hash)}`);
  }

  async function handleTask(taskId: bigint, requester: string, prompt: string, reward: bigint, deadline: bigint) {
    const key = taskId.toString();
    if (seen.has(key)) return;
    seen.add(key);

    if (requester.toLowerCase() === me) return;
    const parsed = parsePrompt(prompt);
    if (!parsed) return log.warn(`#${taskId} unparseable prompt — skipping`);
    if (!CAPS.includes(parsed.type)) return log.info(`#${taskId} ${parsed.type} outside my capabilities — skipping`);
    if (reward < MIN_REWARD) return log.info(`#${taskId} reward ${mon(reward)} below my minimum — skipping`);
    const secsLeft = Number(deadline) - Math.floor(Date.now() / 1000);
    if (secsLeft < 20) return log.info(`#${taskId} expires in ${secsLeft}s — skipping`);

    while (inFlight >= MAX_IN_FLIGHT) await sleep(200);
    inFlight++;
    try {
      log.info(`#${taskId} ${parsed.type} · reward ${mon(reward)} · attempting claim…`);
      try {
        const { hash } = await sendAndWait("claimTask", [taskId]);
        log.ok(`claimed #${taskId} · ${txUrl(hash)}`);
      } catch (e) {
        return log.warn(`#${taskId} lost the race (${shortErr(e)})`);
      }

      log.info(`#${taskId} thinking… (LLM)`);
      const t0 = Date.now();
      const { text, mocked } = await runTask(parsed.type, parsed.payload);
      log.info(`#${taskId} answer in ${Date.now() - t0}ms${mocked ? " (mock)" : ""}: "${clip(text, 70)}"`);

      try {
        const { hash } = await sendAndWait("submitResultAndPayout", [taskId, text]);
        const nb = await publicClient.getBalance({ address: account.address });
        log.ok(`delivered #${taskId} · +${mon(reward)} · balance ${formatEther(nb)} MON · ${txUrl(hash)}`);
      } catch (e) {
        log.error(`#${taskId} submit failed: ${shortErr(e)}`);
      }
    } finally {
      inFlight--;
    }
  }

  // 1) live events (start BEFORE catch-up so nothing falls in the gap; `seen` dedupes)
  void pollHubEvents((e) => {
    if (e.eventName === "TaskCreated") {
      const a = e.args;
      return handleTask(a.taskId, a.requester, a.prompt, a.reward, a.deadline);
    }
  });

  // 2) catch-up: pick up still-open tasks created before we started
  const total = await publicClient.readContract({ address: env.hub, abi: a2aHubAbi, functionName: "taskCount" });
  const lowest = total > 15n ? total - 14n : 1n;
  for (let i = total; i >= lowest; i--) {
    const t = await publicClient.readContract({
      address: env.hub, abi: a2aHubAbi, functionName: "tasks", args: [i],
    });
    const [, requester, , reward, , deadline, status, prompt] = t;
    if (status === 0) void handleTask(i, requester, prompt, reward, deadline); // 0 = Open
  }

  log.info("listening for tasks…");
}

main().catch((e) => {
  log.error(`fatal: ${shortErr(e)}`);
  process.exit(1);
});
```

#### 3.2.6 `agents/src/preflight.ts` — readiness check (run before every demo)
```ts
import { formatEther, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "./clients";
import { a2aHubAbi } from "./shared/abi";
import { env } from "./env";
import { runTask } from "./llm";

let failed = false;
const ok = (m: string) => console.log("\x1b[32m✔\x1b[0m", m);
const warn = (m: string) => console.log("\x1b[33m!\x1b[0m", m);
const bad = (m: string) => { console.log("\x1b[31m✘\x1b[0m", m); failed = true; };

try {
  const chainId = await publicClient.getChainId();
  chainId === 10143 ? ok(`RPC chainId ${chainId} (Monad Testnet)`) : bad(`wrong chainId ${chainId} (expected 10143)`);
  const head = await publicClient.getBlockNumber();
  ok(`head block ${head}`);

  const code = await publicClient.getCode({ address: env.hub });
  code && code !== "0x" ? ok(`A2AHub has bytecode at ${env.hub}`) : bad(`no contract at HUB_ADDRESS ${env.hub}`);
  const n = await publicClient.readContract({ address: env.hub, abi: a2aHubAbi, functionName: "taskCount" });
  ok(`taskCount() = ${n}`);

  const wallets: [string, string, bigint][] = [
    ["DEPLOYER_PRIVATE_KEY", "deployer", parseEther("0.05")],
    ["REQUESTER_PRIVATE_KEY", "requester", parseEther("0.5")],
    ["WORKER_1_PRIVATE_KEY", "worker 1", parseEther("0.1")],
    ["WORKER_2_PRIVATE_KEY", "worker 2", parseEther("0.1")],
  ];
  for (const [k, label, min] of wallets) {
    const pk = process.env[k];
    if (!pk) { bad(`${k} missing`); continue; }
    const addr = privateKeyToAccount(pk as Hex).address;
    const b = await publicClient.getBalance({ address: addr });
    b >= min ? ok(`${label} ${addr} · ${formatEther(b)} MON`) : bad(`${label} ${addr} low: ${formatEther(b)} MON (< ${formatEther(min)})`);
  }

  if (env.mockLlm) warn("MOCK_LLM=true — answers will be canned");
  else if (!process.env.OPENAI_API_KEY) warn("OPENAI_API_KEY missing — will fall back to mock answers");
  const t0 = Date.now();
  const r = await runTask("SENTIMENT", "I love this hackathon");
  ok(`LLM ping ${Date.now() - t0}ms${r.mocked ? " (mock)" : ""} → ${r.text}`);
} catch (e) {
  bad(`preflight crashed: ${(e as Error).message.split("\n")[0]}`);
}
console.log(failed ? "\n\x1b[31mPREFLIGHT FAILED\x1b[0m" : "\n\x1b[32mALL GREEN — ready to demo\x1b[0m");
process.exit(failed ? 1 : 0);
```

#### 3.2.7 Worker race & capability routing (demo talking point)
With the default `.env`: `SUMMARIZE`/`TRANSLATE_ES` → only **Scribe**; `CODE_REVIEW` → only **Oracle**; `SENTIMENT` → **both race** (loser logs `lost the race`). This shows *specialization + competition* without any coordinator.

#### 3.2.8 Run & verify Phase 2
```bash
npm run preflight                                  # must be ALL GREEN
# terminal 1
npm --prefix agents run worker -- 1
# terminal 2
npm --prefix agents run worker -- 2
# terminal 3
npm --prefix agents run requester -- once          # 1 task end-to-end
npm --prefix agents run requester -- burst 5       # 5 concurrent tasks
```
Expected: for each task you see `posted → claimed → thinking → delivered (+MON)` and the requester prints `SUMMARY · posted=5 settled=5`.

#### 3.2.9 `agents/src/gen-wallets.ts`
```ts
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

for (const name of ["DEPLOYER", "REQUESTER", "WORKER_1", "WORKER_2"]) {
  const pk = generatePrivateKey();
  console.log(`${name}_PRIVATE_KEY=${pk}   # ${privateKeyToAccount(pk).address}`);
}
console.log("\n⚠ TESTNET ONLY. Paste the KEY lines into .env. Fund the DEPLOYER address at https://faucet.monad.xyz");
```

#### 3.2.10 `agents/src/fund-agents.ts`
```ts
import { parseEther, formatEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "./clients";
import { makeAgentWallet } from "./tx";
import { hexEnv } from "./env";

const deployer = makeAgentWallet(hexEnv("DEPLOYER_PRIVATE_KEY"));
const targets: [string, string][] = [
  ["REQUESTER_PRIVATE_KEY", "1"],
  ["WORKER_1_PRIVATE_KEY", "0.3"],
  ["WORKER_2_PRIVATE_KEY", "0.3"],
];

const bal = await publicClient.getBalance({ address: deployer.account.address });
console.log(`deployer ${deployer.account.address} has ${formatEther(bal)} MON`);

for (const [envKey, amt] of targets) {
  const pk = process.env[envKey];
  if (!pk) continue;
  const to = privateKeyToAccount(pk as Hex).address;
  const hash = await deployer.walletClient.sendTransaction({ to, value: parseEther(amt) });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✔ sent ${amt} MON → ${envKey} (${to})`);
}
```

**✅ Phase 2 gate:** `preflight` all green · `requester burst 5` ends with `settled=5` · both workers show earnings · `npm --prefix agents run typecheck` clean · `git commit -m "phase2: agents"` and tag `v1-agents`.

---
### PHASE 3 — REAL-TIME FRONTEND & LIVE ACTIVITY TERMINAL (T+2:00 → T+5:00)

**Goal:** a futuristic, dark "mission control" dashboard that makes the on-chain economy *visible*: agents pulsing, tasks changing state, MON flowing, every event linked to the Monad explorer.

#### 3.3.0 Design rules
1. **The dashboard is read-only and chain-truthful.** Everything in the Terminal / Task Board / Stats comes from Monad logs & view calls. Off-chain telemetry (P1) is visually distinct (dim, italic, `thinking…` lines).
2. Client components only where hooks are used (`"use client"`). `page.tsx` is a client component.
3. Env access in the browser **must** use `NEXT_PUBLIC_*`.
4. **No external fonts, no images from the network.** System font stack + inline SVG + lucide-react icons.
5. Poll gently: 1 s log poll, 3 s agent/stat poll. Never batch more than 99 blocks per `getLogs`.
6. Must look good on a **projector**: base font ≥ 14 px, terminal font 13–15 px, high contrast.

#### 3.3.1 Visual language (Tailwind tokens)
Add to `web/tailwind.config.ts` → `theme.extend.colors`:
```ts
colors: {
  void:   "#07060d",   // page bg
  panel:  "#0d0b17",   // card bg
  edge:   "#231f3a",   // borders
  ink:    "#e7e5f4",   // primary text
  mute:   "#8b87a8",   // secondary text
  monad:  "#836EF9",   // Monad purple (hub, accents)
  req:    "#22d3ee",   // requester cyan
  wrk1:   "#34d399",   // worker 1 green
  wrk2:   "#fbbf24",   // worker 2 amber
  pay:    "#34d399",   // payment / success
  bad:    "#f87171",   // refund / error
},
keyframes: {
  rise:  { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "none" } },
  blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
},
animation: { rise: "rise .25s ease-out", blink: "blink 1.2s ease-in-out infinite" },
```
`globals.css`: dark body (`bg-void text-ink`), `font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, mono: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; subtle radial purple glow behind the header; thin custom scrollbars.

#### 3.3.2 Screen layout
```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◉ AUTONOME  A2A Compute & Task Mesh      [Monad Testnet ● blk 1,234,567]   Hub 0x12…ab ↗ │  Header
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  TASKS 12 │ SETTLED 11 │ MON PAID 0.062 │ AVG LIFECYCLE 6 blk ≈ 2.4 s │ EVENTS/10s 14    │  StatsBar
├───────────────────────────┬───────────────────────────────────────┬──────────────────────┤
│  AGENT GRAPH (SVG)        │  LIVE ACTIVITY TERMINAL               │  TASK BOARD          │
│   Atlas ──▶ [HUB] ◀── Scribe│  14:02:11  blk 123  [REQ] Atlas      │  #12 SUMMARIZE  ✓    │
│        pulses on events   │    posted TASK #7 · 0.005 MON         │  #11 SENTIMENT  ⟳    │
│                           │  14:02:12  [WRK] Scribe claimed #7    │  #10 CODE_REVIEW …   │
│  LEADERBOARD              │  14:02:13  ░ Scribe thinking… (P1)    │  (status chips,      │
│  1 Scribe  0.031 MON  7✓  │  14:02:14  [PAY] 0.005 MON → Scribe ✓ │   result preview,    │
│  2 Oracle  0.020 MON  4✓  │  … tx 0x12ab…ef90 ↗                   │   tx links)          │
└───────────────────────────┴───────────────────────────────────────┴──────────────────────┘
(P1) PostTaskPanel: [Connect Wallet] prompt box + reward → "Hire the mesh" button (below the grid)
```
Grid: `grid-cols-1 lg:grid-cols-[320px_1fr_380px] gap-4`; terminal column gets `min-h-[60vh]`.

#### 3.3.3 `web/src/lib/hub.ts` — data layer (reference implementation, copy verbatim)
```ts
"use client";

import { useEffect, useRef, useState } from "react";
import { createPublicClient, http, zeroAddress, type Address, type Hex } from "viem";
import { monadTestnet } from "./shared/chain";
import { a2aHubAbi, TASK_STATUS, type TaskStatusName } from "./shared/abi";

export const HUB = (process.env.NEXT_PUBLIC_HUB_ADDRESS ?? "0x") as Address;
const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz";

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC),
  pollingInterval: 1000,
});

const MAX_RANGE = 99n; // keep getLogs ranges small (public RPC limit)
const BACKFILL = 300n; // ≈ 2 minutes of history for the terminal on page load
const FEED_CAP = 300;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ───────────────────────── types ─────────────────────────
export type HubEventName =
  | "AgentRegistered" | "TaskCreated" | "TaskClaimed"
  | "TaskCompleted" | "PaymentReleased" | "TaskRefunded";

export interface TaskView {
  id: number;
  requester: Address;
  worker?: Address;
  reward: bigint;
  deadline: number;
  status: TaskStatusName;
  prompt: string;
  result?: string;
  createdBlock?: bigint;
  createTx?: Hex;
  claimTx?: Hex;
  completeTx?: Hex;
}

export interface AgentView {
  address: Address;
  name: string;
  role: string;
  tasksPosted: number;
  tasksCompleted: number;
  totalEarned: bigint;
  totalSpent: bigint;
}

export interface FeedLine {
  key: string;
  kind: HubEventName;
  block: bigint;
  tx: Hex;
  seenAt: number;        // Date.now() when this client first saw it
  taskId?: number;
  actor?: Address;       // who did it (requester / worker / agent)
  other?: Address;       // counterparty when known
  amount?: bigint;
  note?: string;         // prompt / result / "name (role)"
}

export interface HubState {
  ready: boolean;
  error?: string;
  head: bigint;
  tasks: Record<number, TaskView>;
  feed: FeedLine[];
  lifecycleBlocks: number[]; // blocks from TaskCreated → PaymentReleased (recent)
}

const EMPTY: HubState = { ready: false, head: 0n, tasks: {}, feed: [], lifecycleBlocks: [] };

// ───────────────────────── chain reads ─────────────────────────
async function fetchLogs(fromBlock: bigint, toBlock: bigint) {
  return publicClient.getContractEvents({
    abi: a2aHubAbi, address: HUB, fromBlock, toBlock, strict: true,
  });
}
type HubLog = Awaited<ReturnType<typeof fetchLogs>>[number];

async function hydrateTasks(): Promise<Record<number, TaskView>> {
  const count = await publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "taskCount" });
  const ids: bigint[] = [];
  for (let i = count; i >= 1n && ids.length < 12; i--) ids.push(i);
  const rows = await Promise.all(
    ids.map((id) => publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "tasks", args: [id] })),
  );
  const out: Record<number, TaskView> = {};
  for (const r of rows) {
    const [id, requester, worker, reward, , deadline, status, prompt, result] = r;
    out[Number(id)] = {
      id: Number(id), requester, reward, deadline: Number(deadline),
      worker: worker === zeroAddress ? undefined : worker,
      status: TASK_STATUS[status] ?? "Open",
      prompt, result: result || undefined,
    };
  }
  return out;
}

// ───────────────────────── reducer ─────────────────────────
function reduceLog(s: HubState, log: HubLog): HubState {
  const base = { key: `${log.transactionHash}:${log.logIndex}`, block: log.blockNumber, tx: log.transactionHash, seenAt: Date.now() };
  const tasks = { ...s.tasks };
  const lifecycle = [...s.lifecycleBlocks];
  let line: FeedLine;

  switch (log.eventName) {
    case "AgentRegistered": {
      line = { ...base, kind: "AgentRegistered", actor: log.args.agent, note: `${log.args.name} (${log.args.role})` };
      break;
    }
    case "TaskCreated": {
      const a = log.args;
      const id = Number(a.taskId);
      tasks[id] = {
        id, requester: a.requester, reward: a.reward, deadline: Number(a.deadline),
        status: "Open", prompt: a.prompt, createdBlock: log.blockNumber, createTx: log.transactionHash,
      };
      line = { ...base, kind: "TaskCreated", taskId: id, actor: a.requester, amount: a.reward, note: a.prompt };
      break;
    }
    case "TaskClaimed": {
      const id = Number(log.args.taskId);
      const t = tasks[id];
      if (t) tasks[id] = { ...t, worker: log.args.worker, status: "Claimed", claimTx: log.transactionHash };
      line = { ...base, kind: "TaskClaimed", taskId: id, actor: log.args.worker, other: t?.requester };
      break;
    }
    case "TaskCompleted": {
      const id = Number(log.args.taskId);
      const t = tasks[id];
      if (t) tasks[id] = { ...t, status: "Completed", result: log.args.result, completeTx: log.transactionHash };
      line = { ...base, kind: "TaskCompleted", taskId: id, actor: log.args.worker, other: t?.requester, note: log.args.result };
      break;
    }
    case "PaymentReleased": {
      const id = Number(log.args.taskId);
      const t = tasks[id];
      if (t?.createdBlock !== undefined) lifecycle.push(Number(log.blockNumber - t.createdBlock));
      line = { ...base, kind: "PaymentReleased", taskId: id, actor: log.args.worker, other: t?.requester, amount: log.args.amount };
      break;
    }
    case "TaskRefunded": {
      const id = Number(log.args.taskId);
      const t = tasks[id];
      if (t) tasks[id] = { ...t, status: "Refunded" };
      line = { ...base, kind: "TaskRefunded", taskId: id, actor: log.args.requester, amount: log.args.amount };
      break;
    }
  }
  return { ...s, tasks, feed: [...s.feed, line].slice(-FEED_CAP), lifecycleBlocks: lifecycle.slice(-50) };
}

// ───────────────────────── hooks ─────────────────────────
/** Live feed + task map. Hydrates recent tasks, back-fills ~300 blocks of events, then polls forever. */
export function useHubFeed(): HubState {
  const [state, setState] = useState<HubState>(EMPTY);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let stop = false;

    const push = (logs: HubLog[]) => {
      const fresh = logs.filter((l) => {
        const k = `${l.transactionHash}:${l.logIndex}`;
        if (seen.current.has(k)) return false;
        seen.current.add(k);
        return true;
      });
      if (fresh.length && !stop) setState((s) => fresh.reduce((acc, l) => reduceLog(acc, l), s));
    };

    (async () => {
      let cursor = 0n;
      try {
        const head0 = await publicClient.getBlockNumber({ cacheTime: 0 });
        const tasks = await hydrateTasks();
        if (stop) return;
        setState((s) => ({ ...s, ready: true, head: head0, tasks }));
        cursor = head0 > BACKFILL ? head0 - BACKFILL : 0n;
      } catch (e) {
        if (!stop) setState((s) => ({ ...s, error: String((e as Error).message ?? e).split("\n")[0] }));
        return;
      }
      while (!stop) {
        try {
          const head = await publicClient.getBlockNumber({ cacheTime: 0 });
          while (cursor <= head && !stop) {
            const to = cursor + MAX_RANGE < head ? cursor + MAX_RANGE : head;
            push(await fetchLogs(cursor, to));
            cursor = to + 1n;
          }
          if (!stop) setState((s) => (s.head === head ? s : { ...s, head, error: undefined }));
        } catch (e) {
          console.error("[useHubFeed]", e); // keep polling; transient RPC errors are expected
        }
        await sleep(1000);
      }
    })();

    return () => { stop = true; };
  }, []);

  return state;
}

/** Agent profiles + global task count, refreshed every 3 s (also the source for global stats). */
export function useAgents(): { agents: AgentView[]; taskCount: number } {
  const [data, setData] = useState<{ agents: AgentView[]; taskCount: number }>({ agents: [], taskCount: 0 });

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const [list, count] = await Promise.all([
          publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "getAgents" }),
          publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "taskCount" }),
        ]);
        const rows = await Promise.all(
          list.map((a) => publicClient.readContract({ address: HUB, abi: a2aHubAbi, functionName: "agents", args: [a] })),
        );
        if (stop) return;
        setData({
          taskCount: Number(count),
          agents: rows.map((r, i) => ({
            address: list[i], name: r[0], role: r[1],
            tasksPosted: Number(r[2]), tasksCompleted: Number(r[3]), totalEarned: r[4], totalSpent: r[5],
          })),
        });
      } catch (e) {
        console.error("[useAgents]", e);
      }
    };
    void tick();
    const id = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  return data;
}
```

#### 3.3.4 `web/src/lib/format.ts` (spec)
Export:
- `shortAddr(a: string): string` → `0x12ab…ef90`
- `fmtMon(wei: bigint, dp = 4): string` → uses `formatEther`, trims to `dp` decimals, strips trailing zeros
- `fmtClock(ms: number): string` → `HH:MM:SS.mmm` (local time)
- `stripType(prompt: string): { type: string; payload: string }` → split `TYPE|payload`
- `makeNameOf(agents: AgentView[]): (addr?: string) => string` → name if known else `shortAddr`
- `describe(line: FeedLine, nameOf): { tag: "REQ"|"WRK"|"PAY"|"SYS"; color: string; text: string }` using exactly:
  - `AgentRegistered` → `SYS` · `"{note} joined the mesh"`
  - `TaskCreated` → `REQ` · `"{actor} posted TASK #{id} [{TYPE}] · {amount} MON escrowed"`
  - `TaskClaimed` → `WRK` · `"{actor} claimed TASK #{id}"`
  - `TaskCompleted` → `WRK` · `"{actor} delivered TASK #{id}: “{clip(note, 80)}”"`
  - `PaymentReleased` → `PAY` · `"{amount} MON → {actor} for TASK #{id} ✓ settled"`
  - `TaskRefunded` → `SYS` (red) · `"TASK #{id} expired — {amount} MON refunded to {actor}"`

#### 3.3.5 Components — exact specs

| Component | Props | Behavior / acceptance criteria |
|---|---|---|
| **`Header`** | `head: bigint` | Wordmark `AUTONOME` (tracking-widest, Monad-purple glow), subtitle "A2A Compute & Task Mesh". Right side: pill `Monad Testnet` + pulsing dot (`animate-blink`) + `blk {head.toLocaleString()}`; hub address chip linking to `addressUrl(HUB)` (new tab). |
| **`StatsBar`** | `taskCount, agents, lifecycleBlocks, feed` | 5 tiles: **Tasks** (`taskCount`) · **Settled** (Σ `tasksCompleted` over agents) · **MON Paid** (Σ `totalEarned`, `fmtMon`) · **Avg lifecycle** (`mean(lifecycleBlocks)` blocks and `≈ blocks × 0.4 s`; show `—` if empty) · **Events / 10 s** (count of `feed` lines with `seenAt > now-10000`, re-rendered each second via a `useNow(1000)` tick). Numbers use `tabular-nums`. |
| **`Terminal`** | `feed, nameOf, thoughts?` | Black panel with faux title bar (`●●●  autonome@monad:~ live`). Each line `animate-rise`: `{clock} blk {block} [{TAG}] {text}  {TxLink}`. Tag colors: REQ=`req`, WRK=`wrk1`/`wrk2` by worker index, PAY=`pay`, SYS=`mute`/`bad`. **Auto-scroll to bottom unless the user has scrolled up** (track `isAtBottom`); show a "↓ new events" chip when paused. Blinking block cursor on the last line. Max 300 lines (already capped). Optional `thoughts` lines (P1) rendered dim/italic with `░` prefix, merged by timestamp. |
| **`AgentGraph`** | `agents, feed, nameOf` | SVG `viewBox="0 0 320 380"`. **Hub node** center (Monad purple, label `A2AHub`). Requesters (role `requester`) stacked on the **left**, workers on the **right**, evenly spaced vertically. Each agent: circle (r=22, colored by role/worker index) + name label + tiny earned/spent caption. Edges: agent↔hub lines (`stroke` edge color). **Pulses:** for each feed line with `seenAt` within the last 1.4 s, render a small circle with `<animateMotion dur="0.9s" fill="freeze" path="M x1 y1 L x2 y2">` along the edge — `TaskCreated`: requester→hub; `TaskClaimed`/`TaskCompleted`: worker→hub; `PaymentReleased`: hub→worker (green); `TaskRefunded`: hub→requester (red). Re-render each 300 ms via a `useNow(300)` tick. Must not crash with 0 agents (show "waiting for agents…"). |
| **`TaskBoard`** | `tasks, nameOf` | Newest first, max 10 cards. Card: `#id` + type chip, **status chip** (Open=purple, Claimed=amber, Completed=green, Refunded=red), reward `MON`, requester → worker names, `result` preview (2 lines, clipped), and `TxLink`s for create/claim/complete when present. Status changes animate (`animate-rise` keyed by `id+status`). |
| **`Leaderboard`** | `agents, nameOf` | Workers sorted by `totalEarned` desc: rank, name, earned (MON), `tasksCompleted ✓`. Requesters listed below with `totalSpent`. Subtle bar proportional to earned. |
| **`TxLink`** | `hash: string, label?: string` | `<a href={txUrl(hash)} target="_blank" rel="noreferrer">` showing `0x12ab…ef90 ↗` in mono, `text-monad hover:underline`. |
| **`PostTaskPanel`** *(P1)* | — | RainbowKit `ConnectButton`; textarea (prompt payload), select (task TYPE), reward input default `0.01`; button **"Hire the mesh"** → `useWriteContract` `createTask([encode(TYPE,payload), 300n], value: parseEther(reward))`; shows pending/confirmed tx link; disabled when not connected or on wrong chain (offer `useSwitchChain` to 10143). The agents then pick it up live — *great demo beat: "now you hire them."* |
| **`ThoughtStream`** *(P1)* | — | `useThoughts()` hook: `new EventSource("/api/telemetry")`, keep last 100 `{ts, agent, level, msg}`; pass to `Terminal`. Auto-reconnect is built into `EventSource`. |

**`useNow(ms)`** — tiny hook: `const [now,setNow]=useState(Date.now()); useEffect(()=>{const i=setInterval(()=>setNow(Date.now()),ms);return()=>clearInterval(i)},[ms]); return now;`

#### 3.3.6 `web/src/app/page.tsx` (composition spec)
```tsx
"use client";
// 1. const hub = useHubFeed(); const { agents, taskCount } = useAgents(); const nameOf = makeNameOf(agents);
// 2. Error state: if (hub.error) show a red banner "RPC error: … (check NEXT_PUBLIC_HUB_ADDRESS / RPC)".
// 3. Loading state: if (!hub.ready) show skeleton "connecting to Monad…".
// 4. Layout per §3.3.2. Pass `thoughts` from useThoughts() (P1) into <Terminal/>.
// 5. If NEXT_PUBLIC_HUB_ADDRESS is missing/"0x": render a full-page setup hint instead of crashing.
```

#### 3.3.7 `web/next.config.mjs`
```js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
```
*(If `create-next-app` generated `next.config.js`/`.ts`, keep that file — just make sure `reactStrictMode: true`.)*

#### 3.3.8 (P1) Off-chain telemetry route — `web/src/app/api/telemetry/route.ts`
```ts
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
```
Agents already POST here when `TELEMETRY_URL` is set (§3.2.3 `logger.ts`). **Works only with `next dev`/`next start` on your laptop** (single Node process) — not on serverless hosting. That is fine for the demo.

#### 3.3.9 (P1) Wallet providers — only if time allows
`web/src/lib/wagmi.ts`
```ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { monadTestnet } from "./shared/chain";

export const wagmiConfig = getDefaultConfig({
  appName: "Autonome",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "autonome-demo", // injected wallets work regardless
  chains: [monadTestnet],
  ssr: true,
});
```
`web/src/app/providers.tsx`
```tsx
"use client";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { wagmiConfig } from "@/lib/wagmi";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#836EF9" })}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```
Wrap `{children}` in `layout.tsx` with `<Providers>`. **wagmi v2 API only**: `useWriteContract`, `useAccount`, `useSwitchChain`, `useWaitForTransactionReceipt` (never `useContractWrite`/`usePrepareContractWrite`).

#### 3.3.10 Run & verify Phase 3
```bash
cp web/.env.local.example web/.env.local     # then fill NEXT_PUBLIC_HUB_ADDRESS
npm --prefix web run dev                     # http://localhost:3000
# in other terminals: workers + requester (see §3.2.8)
npm --prefix web run build                   # MUST pass (type errors fail the build)
```
**✅ Phase 3 gate:** with agents running, the Terminal shows live lines within ~2 s of each event · Task Board cards flip Open→Claimed→Completed · Leaderboard totals increase · every tx link opens the correct explorer page · `next build` passes · `git commit -m "phase3: dashboard"` and tag `v2-ui`.

> **Cut-line reminder:** at **T+4:30**, if `AgentGraph` isn't done, replace it with a static agent list and move on. Terminal + Task Board + Stats are the P0 visuals.

---
### PHASE 4 — INTEGRATION, TESTING & LIVE DEMO SCRIPT (T+5:00 → T+6:00)

**Goal:** a demo that runs flawlessly in **3 minutes** with one keypress, plus a safety net for when the venue's Wi-Fi/RPC/LLM misbehaves.

#### 3.4.1 End-to-end test matrix (run top to bottom; fix before moving on)

| # | Test | How | Pass criteria |
|---|---|---|---|
| T1 | Preflight | `npm run preflight` | All ✔ (LLM may be mock) |
| T2 | Contract tests | `npm run contracts:test` | All pass |
| T3 | Single task | `demo:up` running, then `npm --prefix agents run requester -- once` | Task goes Open→Claimed→Completed; requester prints `SUMMARY posted=1 settled=1` |
| T4 | Burst concurrency | `npm run demo:go` (burst 5) | `settled=5`, no nonce errors, ≥ 2 distinct workers earn |
| T5 | Race handling | Post 3 `SENTIMENT` tasks (both workers capable) | Loser logs `lost the race`, no crash, no double payment |
| T6 | UI truth | Compare Task Board vs explorer for one task | Same status, reward, worker; tx links resolve |
| T7 | Worker restart | Kill worker 1 mid-burst, restart it | Catch-up scan picks up remaining `Open` tasks |
| T8 | LLM failure | Set `MOCK_LLM=true` (or bad API key) | Agents keep working with `[mock]` answers |
| T9 | Expiry/refund | Set `TASK_TTL_SECONDS=30`, stop workers, post 1 task, wait | Requester logs `refunded expired task`; UI shows `Refunded` |
| T10 | Cold-start UI | Hard-refresh the dashboard mid-run | History back-fills; no console errors; counters correct |
| T11 | Human hire *(P1)* | Connect wallet in `PostTaskPanel`, post a task | Agents complete it; your address appears as requester |
| T12 | Cold boot rehearsal | Reboot terminals; follow §3.4.2 from scratch | Demo-ready in < 90 s |

#### 3.4.2 Pre-demo checklist (T-10 minutes)
1. `git status` clean; on the tagged working commit.
2. `npm run preflight` → **ALL GREEN** (top up with `npm --prefix agents run fund` if needed; requester ≥ 0.5 MON).
3. `npm run demo:up` → web on :3000 + Scribe + Oracle (3 panes in one terminal via concurrently).
4. Browser: dashboard open full-screen, zoom 110–125 %, **one tab only**; second tab with the explorer on the hub address.
5. Pre-run `npm --prefix agents run requester -- once` so the board isn't empty and agents are registered.
6. Phone hotspot ready. Backup video recorded (§3.4.5). `.env` has `MOCK_LLM=false`; flip to `true` only if OpenAI is slow.
7. Silence notifications; close other heavy tabs (RPC rate limit is per IP).

#### 3.4.3 The 3-minute demo script (word-for-word beats)

| Time | Action (hands) | Narration (mouth) |
|---|---|---|
| **0:00–0:20** | Dashboard on screen, graph idle | "AI agents can think, but they can't *transact* with each other without a human holding the wallet. **Autonome** is an on-chain micro-economy where agents hire, execute and pay each other — autonomously — on Monad." |
| **0:20–0:50** | Point at graph: Atlas (requester) ← hub → Scribe, Oracle (workers) | "Meet three agents. **Atlas** needs work done. **Scribe** and **Oracle** are specialists with different skills. The only thing between them is one smart contract: `A2AHub` — escrow, state machine and instant payout." |
| **0:50–1:00** | Run `npm run demo:go` (burst 5) | "I'm pressing one key. From here, no humans." |
| **1:00–1:50** | Narrate the Terminal as lines stream; graph pulses | "Atlas locks MON in escrow — five tasks in the same breath. Watch: workers claim them, call an LLM off-chain, and submit results. **The contract pays the worker in the same transaction as the result.** Two workers racing on the same job — one wins, the other gracefully backs off." |
| **1:50–2:10** | Click one `PaymentReleased` tx link → explorer | "That's a real Monad Testnet transaction: result delivered, MON paid, one hop." |
| **2:10–2:35** | Point to StatsBar lifecycle + leaderboard | "Whole lifecycle — posted to paid — in a handful of blocks. Monad's ~400 ms blocks and cheap gas are what make **micro-payments between machines** viable. And independent tasks touch independent storage — exactly the kind of workload Monad's parallel execution is built for." |
| **2:35–2:55** | *(P1)* Connect wallet, post a task by hand | "And you can hire the mesh yourself — post a task, and agents pick it up in seconds." |
| **2:55–3:00** | Back to graph | "Autonome: the settlement layer for the machine economy. Built today on Monad." |

#### 3.4.4 Failure drills (decide *now*, not on stage)
| Symptom | Fast fix | Time |
|---|---|---|
| Dashboard blank / "RPC error" | Check `NEXT_PUBLIC_HUB_ADDRESS`; switch `NEXT_PUBLIC_RPC_URL` to `https://rpc-testnet.monadinfra.com`; restart `next dev` | 30 s |
| HTTP 429 | Close extra tabs; `POLL_INTERVAL_MS=1500`; backup RPC | 30 s |
| OpenAI slow/401 | `MOCK_LLM=true` and restart workers (answers show `[mock]` — say so honestly) | 20 s |
| `nonce too low` / stuck requester | Ctrl-C and rerun `demo:go` (nonce resyncs from chain at startup) | 10 s |
| Worker out of gas | `npm --prefix agents run fund` | 20 s |
| Chain/RPC totally down | Play the backup video; show explorer history of earlier runs | 0 s |
| Nothing is claimed | `npm run preflight`; check workers' `listening for tasks…`; check `HUB_ADDRESS` identical in both env files | 60 s |

#### 3.4.5 Safety nets (do these at T+5:30)
- **Record a 60–90 s screen capture** of a clean run (QuickTime / OBS). Keep it on the desktop.
- **Screenshot** the explorer page of the hub address showing many txs.
- Keep **one pre-funded spare wallet set** in a second `.env.backup`.
- Commit + push; tag `demo-ready`.

#### 3.4.6 Submission artifacts
- **README.md** (≤ 1 page): one-liner, 30-second architecture diagram (copy §1.1), "Why Monad" (400 ms blocks, cheap gas, parallel-friendly storage layout), quick start (5 commands), deployed address + explorer link, demo video link, team, roadmap.
- **Why Monad (judge-facing bullets):** (1) micro-payments only make sense with sub-cent fees and sub-second confirmation; (2) agent workloads are bursty and embarrassingly parallel — tasks and workers touch disjoint state; (3) full EVM compatibility → shipped in hours with Foundry + viem.
- **Roadmap slide:** multi-worker consensus verification · reputation-weighted claiming · bidding/auctions · agent sub-contracting chains · ERC-20/stablecoin rewards · task-result attestations.

#### 3.4.7 Stretch goals (only if P0 + P1 are green and rehearsed)
1. **Sub-contracting (A2A²):** a `RESEARCH_BRIEF` task type; the worker posts a `SENTIMENT` sub-task *as a requester*, waits for its `PaymentReleased`, composes both answers, then submits. Shows agents hiring agents (needs a worker wallet with ≥ 0.1 MON and a second `makeAgentWallet` role in the worker).
2. **Contention-free IDs:** replace the global `taskCount` counter on the hot path with `id = uint256(keccak256(abi.encode(msg.sender, perSenderNonce)))` so concurrent `createTask` calls from different requesters share no storage slot (keep `taskCount` as an analytics-only counter updated off the critical path or removed). Changes the ABI → re-run `sync`.
3. **Redundant verification:** two workers answer; requester agent auto-selects via a cheap LLM judge; second worker gets a consolation fee.

#### 3.4.8 Risk register
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Public RPC rate limit/outage | Med | High | Backup RPC env var; bounded polling; single dashboard tab |
| Faucet limits | Med | Med | Fund deployer once → `fund-agents.ts` distributes; ask in Monad Discord for extra MON early |
| OpenAI latency/quota | Med | Med | `MOCK_LLM`, 800-char cap, `max_tokens: 120`, automatic fallback |
| AI agent hallucinated APIs | High | High | §4 guardrails + verification command after every file |
| ABI drift between contract/agents/UI | Med | High | Single `shared/abi.ts` + `npm run sync` + `forge inspect` check |
| Claim races produce noisy errors | High | Low | Expected; logged as `lost the race`; pre-flight gas estimate avoids wasted gas |
| Time overrun on UI | Med | Med | Cut-lines: graph at T+4:30, telemetry at T+4:45, wallet panel at T+5:00 |

---
## 4. STEP-BY-STEP INSTRUCTIONS FOR AI CODING AGENTS

> **How to use this section:** (1) Paste §4.1 into your agent's rules file (`.cursorrules` / `.windsurfrules` / `CLAUDE.md` / `AGENTS.md`). (2) Make sure `plan.md` is in the repo root and *attached/@-mentioned* in the chat. (3) Feed the prompts in §4.3 **one at a time, in order**, running the verification command after each. (4) Never ask an agent to "build the whole thing".

### 4.1 Global rules file (paste verbatim)

```markdown
# AUTONOME — AI AGENT RULES (apply to every task)

## Source of truth
- `plan.md` in the repo root is the spec. Read the referenced section BEFORE writing code.
- Where plan.md contains code, COPY IT VERBATIM. Do not rename, reorder, "modernize" or add features.
- If plan.md is ambiguous or seems wrong, STOP and ask. Do not guess.

## Frozen interface
- Contract ABI lives ONLY in `shared/abi.ts`. Chain config ONLY in `shared/chain.ts`.
- After editing anything in `shared/`, run `npm run sync`. Never hand-edit `agents/src/shared/*` or `web/src/lib/shared/*`.
- Never change function/event names, argument order, struct field order, or revert strings of A2AHub.

## Stack (pinned — do NOT upgrade, swap or add dependencies without asking)
- Solidity 0.8.24 + Foundry. NO OpenZeppelin. Use `require("string")`, not custom errors.
- TypeScript + viem v2 ONLY (no ethers, no web3.js). Agents run with `tsx` (ESM, Node >= 20).
- Next.js 14 App Router, React 18, Tailwind 3, lucide-react. wagmi v2 + RainbowKit v2 (P1 only).
- OpenAI SDK `openai@4` directly. NO LangChain.

## Monad specifics
- Testnet chainId = 10143. RPC = https://testnet-rpc.monad.xyz. Explorer = https://testnet.monadvision.com. Native token MON.
- Do NOT import `monadTestnet` from `viem/chains`; use `shared/chain.ts`.
- Do NOT use `watchContractEvent`, `watchEvent`, `eth_subscribe` or WebSockets. Use the bounded `getContractEvents` pollers provided (<= 99 blocks per call).
- Do NOT hard-code gas limits. Use `estimateContractGas` + 20% buffer (Monad charges on gas limit).
- Do NOT leave viem's default pollingInterval (4000ms). Agents: 500ms. Browser: 1000ms.
- Do NOT enable HTTP batching on the transport.

## Code rules
- All wei values are `bigint`. Never `Number()`/`parseFloat()` a wei amount. Use `parseEther` / `formatEther`.
- Addresses are `` `0x${string}` ``; compare with `.toLowerCase()`.
- No `any`. No `@ts-ignore`. If types fight you, ask or widen with a documented cast.
- Never hard-code private keys, API keys or the hub address. Read from env. Never log secrets. Never commit `.env`.
- Browser env vars MUST be prefixed `NEXT_PUBLIC_`. Files using hooks need `"use client"`.
- No external fonts or network images. System fonts + inline SVG only.
- wagmi v2 hooks only: `useWriteContract`, `useAccount`, `useSwitchChain`, `useWaitForTransactionReceipt`.

## Workflow rules
- One file/prompt at a time. After each file run its verification command and paste the output.
- Verification commands: `forge build && forge test -vv` | `npm --prefix agents run typecheck` | `npm --prefix web run build`.
- If verification fails, fix the root cause. Do not silence errors or delete tests.
- Commit after each green step: `git add -A && git commit -m "<phase>: <what>"`.
- Do not create files that are not listed in plan.md §2 without asking.
```

### 4.2 Hallucination traps (wrong → right)

| Common wrong output | Correct for this project |
|---|---|
| Chain ID `41454`, `10200`, `20143` or `1` | **`10143`** (Monad Testnet). *(20143 is a different network — tempnet.)* |
| `import { monadTestnet } from "viem/chains"` | `import { monadTestnet } from "./shared/chain"` |
| `ethers.Contract`, `provider.on("event")` | viem `getContractEvents` poller (`poller.ts`) |
| `publicClient.watchContractEvent(...)` | `pollHubEvents(...)` |
| `useContractWrite`, `usePrepareContractWrite` (wagmi v1) | `useWriteContract` (wagmi v2) |
| `gas: 5_000_000n` hard-coded | `estimateContractGas` × 1.2 |
| `getLogs({ fromBlock: 0n })` / ranges > 100 | chunk ≤ 99 blocks, start at head or head−300 |
| `import "@openzeppelin/..."` | Hand-rolled `nonReentrant` already in `A2AHub.sol` |
| Custom errors `error NotOpen()` | `require(cond, "not open")` — tests & UI rely on strings |
| `process.env.HUB_ADDRESS` in a React component | `process.env.NEXT_PUBLIC_HUB_ADDRESS` |
| `const reward = 0.005 * 1e18` | `parseEther("0.005")` |
| `Number(reward) / 1e18` | `formatEther(reward)` |
| `tasks(id).status === "Open"` | status is `uint8`/`number`: `0=Open, 1=Claimed, 2=Completed, 3=Refunded` |
| `tasks(id).requester` (object access) | multi-output getter returns a **tuple**: `const [id, requester, worker, …] = …` |
| `next/font/google` | System font stack |
| Creating a second ABI copy by hand | Edit `shared/abi.ts`, run `npm run sync` |
| Using `localStorage` for cross-component state | React state / hooks in `hub.ts` |
| Sequential `await postTask()` in burst mode | `Promise.all(Array.from({length:N}, () => postTask()))` |
| Adding `WebSocket` transport "for realtime" | Don't. Polling at 1 s is intentional |

### 4.3 Prompt pack (feed in this order)

Each prompt is **self-contained**. Replace nothing; paste as-is. Every prompt ends with a **VERIFY** line the agent must execute and report.

---

#### PROMPT 00 — Scaffold *(Phase 0)*
```text
Read plan.md §2 and §3 Phase 0 fully.
Task: create the repository skeleton exactly as in §3.0.2–§3.0.9: folder layout, .gitignore, .env.example, web/.env.local.example, root package.json scripts, scripts/sync-shared.sh, scripts/deploy.sh (chmod +x both). Do NOT write any feature code yet.
Constraints: use only the commands/versions in §3.0.2. Do not install extra packages.
VERIFY: run `forge --version`, `node -v`, `ls -R -L1` and show me the tree; confirm `npm run sync` prints "shared files synced" once shared/ files exist.
```

#### PROMPT 01 — Shared interface *(Phase 1)*
```text
Read plan.md §3.1.5.
Task: create `shared/chain.ts` and `shared/abi.ts` EXACTLY as written (verbatim). Then run `npm run sync`.
Constraints: do not add, remove or reorder any ABI entry. Do not import from viem/chains.
VERIFY: `diff shared/abi.ts agents/src/shared/abi.ts && diff shared/abi.ts web/src/lib/shared/abi.ts` prints nothing.
```

#### PROMPT 02 — Contract *(Phase 1)*
```text
Read plan.md §3.1.1 (spec), §3.1.2 and §3.1.3.
Task: write `contracts/foundry.toml` and `contracts/src/A2AHub.sol` VERBATIM from §3.1.2/§3.1.3.
Constraints: pragma ^0.8.24; no OpenZeppelin; keep require() revert strings identical to the §3.1.1 table; keep struct field order; keep the field-by-field write in createTask (avoids stack-too-deep).
VERIFY: `cd contracts && forge build` succeeds with no errors. Then run `forge inspect A2AHub methods` and confirm every function in shared/abi.ts exists with the same selector name/params.
```

#### PROMPT 03 — Contract tests *(Phase 1)*
```text
Read plan.md §3.1.4.
Task: write `contracts/test/A2AHub.t.sol` VERBATIM.
Constraints: do not weaken, delete or skip any test. If a test fails, the CONTRACT or your transcription is wrong — compare with §3.1.3 before touching the test.
VERIFY: `cd contracts && forge test -vv` → all tests pass. Paste the summary line.
```

#### PROMPT 04 — Deploy *(Phase 1)*
```text
Read plan.md §3.1.6 and §3.1.7.
Task: write `contracts/script/Deploy.s.sol` verbatim and make `npm run contracts:deploy` work.
Constraints: read DEPLOYER_PRIVATE_KEY from env only. Never print the key. Do not hard-code RPC; use MONAD_RPC_URL.
VERIFY: run the deploy; show the printed A2AHub address and the explorer URL https://testnet.monadvision.com/address/<addr>. Then tell me to paste it into .env and web/.env.local (do not guess the address).
```

#### PROMPT 05 — Agent infrastructure *(Phase 2)*
```text
Read plan.md §3.2.0 through §3.2.3 and §3.2.1–§3.2.2.
Task: create in `agents/`: package.json scripts + "type":"module" (merge, don't overwrite deps), tsconfig.json, and src/{env,util,logger,clients,tx,poller,task-protocol,llm}.ts VERBATIM from §3.2.3.
Constraints: viem v2 only; poller must stay bounded at 99 blocks per call; tx.ts must keep the serialized queue + local nonce + estimateContractGas preflight + 20% gas buffer; llm.ts must never throw.
VERIFY: `npm --prefix agents run typecheck` → 0 errors. If viem types complain about getContractEvents, check `strict: true` and that `a2aHubAbi` comes from ./shared/abi (do not change the ABI).
```

#### PROMPT 06 — Requester agent *(Phase 2)*
```text
Read plan.md §3.2.4 (behavior spec + code).
Task: create `agents/src/agent-requester.ts` verbatim.
Constraints: keep Promise.all for burst mode; keep refund watchdog; never hard-code addresses/keys; all amounts bigint.
VERIFY: `npm --prefix agents run typecheck`; then (after workers exist) `npm --prefix agents run requester -- once` and show the log lines through "SUMMARY".
```

#### PROMPT 07 — Worker agent *(Phase 2)*
```text
Read plan.md §3.2.5 (behavior spec + code) and §3.2.7.
Task: create `agents/src/agent-worker.ts` verbatim.
Constraints: poller must start BEFORE the catch-up scan; handleTask must dedupe via `seen`; a claim failure is a normal "lost the race" path, not a crash; cap concurrency at 2.
VERIFY: `npm --prefix agents run typecheck`; run `npm --prefix agents run worker -- 1` and confirm it prints "listening for tasks…" without errors.
```

#### PROMPT 08 — Utilities *(Phase 2)*
```text
Read plan.md §3.2.6, §3.2.9, §3.2.10.
Task: create `agents/src/preflight.ts`, `gen-wallets.ts`, `fund-agents.ts` verbatim.
VERIFY: `npm --prefix agents run typecheck`; `npm run preflight` prints a ✔/✘ line for chain, hub, balances, LLM.
```

#### PROMPT 09 — E2E agent run *(Phase 2 gate)*
```text
Run the Phase 2 verification in plan.md §3.2.8 with two workers and `requester -- burst 5`.
Report: total tasks settled, which worker handled which task, any "lost the race" lines, and any error lines. If anything fails, diagnose from logs and fix the root cause in the smallest possible change; do not restructure.
```

#### PROMPT 10 — Frontend data layer *(Phase 3)*
```text
Read plan.md §3.3.0, §3.3.3, §3.3.4.
Task: create `web/src/lib/hub.ts` VERBATIM from §3.3.3, and `web/src/lib/format.ts` per the §3.3.4 spec (shortAddr, fmtMon, fmtClock, stripType, makeNameOf, describe).
Constraints: "use client" in hub.ts; no wagmi here; no new dependencies; bigint everywhere for wei; describe() output strings must match the spec exactly.
VERIFY: `npm --prefix web run build` passes (an empty page.tsx is fine for now).
```

#### PROMPT 11 — Design system + layout shell *(Phase 3)*
```text
Read plan.md §3.3.1, §3.3.2, §3.3.6, §3.3.7.
Task: (a) extend web/tailwind.config.ts with the exact color tokens + keyframes from §3.3.1; (b) write globals.css (dark theme, system fonts, glow, slim scrollbars); (c) write layout.tsx (metadata title "Autonome — A2A Task Mesh on Monad", no next/font); (d) write page.tsx per §3.3.6 composing Header, StatsBar, AgentGraph, Terminal, TaskBoard, Leaderboard using stub components that render a labeled placeholder box (we will fill them next).
Constraints: page.tsx is a client component; handle missing HUB env, loading and error states; responsive grid `grid-cols-1 lg:grid-cols-[320px_1fr_380px]`.
VERIFY: `npm --prefix web run build` passes; `npm --prefix web run dev` shows the layout shell at http://localhost:3000 with no console errors.
```

#### PROMPT 12 — Terminal + TxLink + Header + StatsBar *(Phase 3, P0)*
```text
Read plan.md §3.3.5 rows: Header, StatsBar, Terminal, TxLink, and the useNow hook.
Task: implement src/components/{TxLink,Header,StatsBar,Terminal}.tsx and a shared `useNow` hook in src/lib/format.ts or src/lib/useNow.ts.
Constraints: Terminal must auto-scroll only when the user is at the bottom, show a "↓ new events" chip otherwise, color tags per spec, animate new lines with `animate-rise`, show block number + local clock + TxLink on every line. Use `describe()` for text. StatsBar derives Settled/MON Paid from agents (Σ tasksCompleted / Σ totalEarned) — NOT from the feed. Use tabular-nums.
VERIFY: with agents running (`npm run demo:go`), lines appear within ~2 s of on-chain events; screenshot or describe what you see; `npm --prefix web run build` passes.
```

#### PROMPT 13 — TaskBoard + Leaderboard *(Phase 3, P0)*
```text
Read plan.md §3.3.5 rows: TaskBoard, Leaderboard.
Task: implement src/components/{TaskBoard,Leaderboard}.tsx.
Constraints: TaskBoard newest-first max 10, status chips colored per spec, show result preview (line-clamp-2), TxLinks for create/claim/complete when present, strip the `TYPE|` prefix via stripType() and show TYPE as a chip. Leaderboard sorts workers by totalEarned desc with a proportional bar; requesters listed separately with totalSpent.
VERIFY: run a burst; cards flip Open→Claimed→Completed; leaderboard totals increase; `npm --prefix web run build` passes.
```

#### PROMPT 14 — AgentGraph *(Phase 3, P1 — cut at T+4:30)*
```text
Read plan.md §3.3.5 row AgentGraph.
Task: implement src/components/AgentGraph.tsx as pure inline SVG (viewBox 0 0 320 380). Hub in the center, requesters left, workers right, evenly spaced. Animated pulses via <animateMotion> along agent↔hub edges for feed lines whose seenAt is within 1.4 s (mapping in the spec). Re-render with useNow(300). Handle 0 agents ("waiting for agents…") and 1–6 agents without overlap.
Constraints: no external animation libs; no canvas; worker colors: index 0 → wrk1, index 1 → wrk2, others → monad.
VERIFY: during a burst, pulses travel requester→hub, worker→hub, hub→worker (green on payment). `npm --prefix web run build` passes.
```

#### PROMPT 15 — Telemetry (thoughts) *(Phase 3, P1 — cut at T+4:45)*
```text
Read plan.md §3.3.8 and §3.3.5 row ThoughtStream.
Task: create src/app/api/telemetry/route.ts VERBATIM from §3.3.8; add `useThoughts()` (EventSource on /api/telemetry, keep last 100) and pass the lines into <Terminal thoughts=... />, rendered dim/italic with a "░" prefix and merged by timestamp.
Constraints: no new dependencies; must not break the page if the SSE connection fails.
VERIFY: with TELEMETRY_URL set and agents running, "thinking…" lines appear in the terminal between claim and payment lines.
```

#### PROMPT 16 — Wallet panel *(Phase 3, P1 — cut at T+5:00)*
```text
Read plan.md §3.3.9 and §3.3.5 row PostTaskPanel.
Task: create src/lib/wagmi.ts and src/app/providers.tsx verbatim; wrap layout children in <Providers>; implement src/components/PostTaskPanel.tsx.
Constraints: wagmi v2 hooks only. createTask args: [`${TYPE}|${payload}`, 300n], value: parseEther(reward). Disable the button when disconnected/wrong chain; offer switch to chain 10143. Show the resulting tx hash as a TxLink.
VERIFY: connect an injected wallet on Monad Testnet, post a task; agents complete it; your address shows as requester in the terminal. `npm --prefix web run build` passes.
```

#### PROMPT 17 — Integration hardening *(Phase 4)*
```text
Read plan.md §3.4.1 and §3.4.4.
Task: run tests T1–T10 in order. For each failure: reproduce, find root cause, apply the smallest fix, re-run the test. Do not refactor. Report a table: test, result, fix applied.
Also add a root npm script `"demo:check": "npm run preflight"` if missing.
```

#### PROMPT 18 — README + submission *(Phase 4)*
```text
Read plan.md §3.4.6.
Task: write README.md (≤ 1 page): one-liner, ASCII architecture (copy §1.1), "Why Monad", quick start (5 commands), deployed address + explorer link (read HUB_ADDRESS from .env — do not invent), demo video placeholder, roadmap.
VERIFY: all commands in the README actually work from a clean clone (state any assumption).
```

### 4.4 Operating rules for the human driver
1. **Interface freeze at T+1:30.** After the contract is deployed, nobody changes the ABI. If you must, redeploy → update `HUB_ADDRESS` in both env files → `npm run sync`.
2. **Two-track parallelism:** Track A (Prompts 02 → 09) and Track B (Prompts 10 → 16) can run in two separate agent sessions. Track B tests against whatever is deployed; if the hub isn't deployed yet, set `NEXT_PUBLIC_HUB_ADDRESS` to any deployed placeholder and expect the "empty" states — they must render cleanly.
3. **Verification before progress.** Do not start the next prompt until the previous VERIFY passes. Paste failing output back to the agent verbatim.
4. **Small diffs.** If an agent starts rewriting files you didn't ask about → `git checkout -- .` and re-issue the prompt with "modify only <file>".
5. **Commit cadence:** after every green VERIFY. Tags: `v0-contract`, `v1-agents`, `v2-ui`, `demo-ready`.
6. **Secrets hygiene:** testnet keys only; `.env` never committed; never paste keys into chat with the agent — it reads `.env` itself.
7. **Time checkpoints:** T+1:30 contract deployed · T+3:00 burst works in terminal · T+4:30 UI P0 done (cut graph if not) · T+5:00 integration · T+5:30 backup video · T+5:45 final rehearsal · T+6:00 submit.

### 4.5 "Stop and ask" triggers for AI agents
The agent must pause and ask the human if: a required env var is missing · the contract ABI would need to change · a package version conflict requires upgrading a pinned dependency · deployment would spend > 0.5 MON · the RPC returns a chain ID other than 10143 · any instruction in this plan conflicts with an error message from the tooling.

---

**END OF `plan.md`** — *Ship the loop first (post → claim → pay → show), then make it beautiful.*
