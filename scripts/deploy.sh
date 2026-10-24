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
