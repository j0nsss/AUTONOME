#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/agents/src/shared" "$ROOT/web/src/lib/shared"
cp "$ROOT/shared/abi.ts" "$ROOT/shared/chain.ts" "$ROOT/agents/src/shared/"
cp "$ROOT/shared/abi.ts" "$ROOT/shared/chain.ts" "$ROOT/web/src/lib/shared/"
echo "✔ shared files synced → agents + web"
