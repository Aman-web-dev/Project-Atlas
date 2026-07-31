#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# scripts/db-sync.sh
#
# Pulls the latest remote schema into supabase/migrations/ and regenerates the
# TypeScript types into src/types/database.ts. Use this after making schema
# changes in the Supabase Dashboard.
#
# Usage:
#   ./scripts/db-sync.sh           # pull + regen types
#   ./scripts/db-sync.sh --check   # CI mode: exit 1 if schema drifts
# -----------------------------------------------------------------------------

set -euo pipefail

CHECK=0
if [[ "${1:-}" == "--check" ]]; then
  CHECK=1
fi

# Move to repo root (where this script lives, up one level)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ------------------------------------------------------------------ preflight
command -v supabase >/dev/null 2>&1 || {
  echo "❌ supabase CLI not found. Install: brew install supabase/tap/supabase" >&2
  exit 1
}

if [[ ! -f "$REPO_ROOT/supabase/config.toml" ]]; then
  echo "❌ No supabase/config.toml. Run: supabase link --project-ref <ref>" >&2
  exit 1
fi

run_pull() {
  echo "🔄 supabase db pull …"
  supabase db pull --schema public,storage
}

run_gen_types() {
  echo "🧬 Regenerating src/types/database.ts …"
  supabase gen types typescript --linked --schema public,storage \
    > "$REPO_ROOT/src/types/database.ts"
  echo "✅ Wrote src/types/database.ts"
}

# ------------------------------------------------------------------- drift check
if [[ "$CHECK" -eq 1 ]]; then
  # Snapshot the type file before, then pull, then diff.
  BEFORE_HASH=$(git hash-object src/types/database.ts 2>/dev/null || true)
  BEFORE_TREE=$(mktemp -d)
  cp -r "$REPO_ROOT/supabase/migrations" "$BEFORE_TREE/" 2>/dev/null || true

  run_pull >/dev/null
  run_gen_types >/dev/null

  if [[ -n "$BEFORE_HASH" ]]; then
    AFTER_HASH=$(git hash-object src/types/database.ts 2>/dev/null || echo "")
    DIFF=$(diff -r "$BEFORE_TREE/migrations" "$REPO_ROOT/supabase/migrations" || true)

    if [[ "$AFTER_HASH" != "$BEFORE_HASH" || -n "$DIFF" ]]; then
      echo ""
      echo "❌ Database drift detected."
      echo "   Run \`./scripts/db-sync.sh\` to bring your local schema in sync."
      exit 1
    fi
  fi
  rm -rf "$BEFORE_TREE"
  echo "✅ No drift."
  exit 0
fi

# ------------------------------------------------------------------- interactive
run_pull
echo ""
run_gen_types
echo ""
echo "🎉 Done. Review the new migration files and commit them:"
echo "   git add supabase/migrations/ src/types/database.ts"
echo "   git commit -m \"feat(db): schema sync\""
