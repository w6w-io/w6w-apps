#!/usr/bin/env bash
# The ONE list of checks for the apps pack. CI (.github/workflows/ci.yml) runs exactly this file,
# and so does the pre-push hook (w6w-io/w6w .githooks/pre-push), so a push that passes here
# passes CI — and builds the way `Reload apps` will after merge. Add a check HERE.
#
#   VERIFY_BASE=<ref>  compare against this ref (default: merge-base with upstream/main or
#                      origin/main). Only the apps the change touches are tested and built;
#                      a shared file (see .github/scripts/changed-apps.mjs) means all of them.
#   CORE_DIR=<dir>     a w6w-core checkout at the SHA reload-apps.yml pins (CI passes one);
#                      default: a git worktree of ../core at that SHA, created on demand.
set -euo pipefail
cd "$(dirname "$0")/.."

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 24 ]; then
  echo "verify: Node $(node --version) — CI runs Node 24; run w6w-io/w6w scripts/install-hooks.sh to fetch it" >&2
  exit 1
fi

step() { printf '\n== %s\n' "$*"; }

step "publish + selection scripts"
node --test .github/scripts/publish-apps.test.mjs .github/scripts/changed-apps.test.mjs

base="${VERIFY_BASE:-}"
if [ -z "$base" ]; then
  for r in upstream/main origin/main; do
    if git rev-parse --verify -q "$r" >/dev/null; then base="$(git merge-base HEAD "$r")"; break; fi
  done
fi
[ -n "$base" ] || base="HEAD~1"

selection="$(node .github/scripts/changed-apps.mjs "$base")"
if [ "$selection" = "ALL" ]; then
  mapfile -t apps < <(node -e 'for (const a of require("./w6w-pack.json").apps) console.log(a.path.replace(/^\.\//, ""))')
  echo "shared files changed since $(git rev-parse --short "$base"): verifying all ${#apps[@]} apps"
else
  mapfile -t apps < <(printf '%s\n' "$selection" | sed '/^$/d')
  echo "apps changed since $(git rev-parse --short "$base"): ${#apps[@]}"
fi
if [ "${#apps[@]}" -eq 0 ]; then printf '\nverify: ok (no app changed)\n'; exit 0; fi

step "tests (${#apps[@]} apps)"
node .github/scripts/run-app-tests.mjs "${apps[@]}"

step "build with the core reload-apps.yml pins"
pin="$(sed -n '/repository: w6w-io\/w6w-core/,/path:/s/.*ref: *\([0-9a-f]\{40\}\).*/\1/p' .github/workflows/reload-apps.yml)"
[ -n "$pin" ] || { echo "verify: no pinned w6w-core ref found in reload-apps.yml" >&2; exit 1; }
core="${CORE_DIR:-}"
if [ -z "$core" ]; then
  core="$(git rev-parse --path-format=absolute --git-common-dir)/w6w-core-pinned"
  if [ "$(git -C "$core" rev-parse HEAD 2>/dev/null)" != "$pin" ]; then
    git -C ../core worktree remove --force "$core" 2>/dev/null || rm -rf "$core"
    git -C ../core worktree add -q --detach "$core" "$pin"
  fi
fi
core="$(cd "$core" && pwd)"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
# deno bundle installs esbuild on first use; parallel bundles race on that copy (see reload-apps.yml).
printf 'export const warm = 1;\n' > "$out/warm.ts"
deno bundle -q -o "$out/warm.js" "$out/warm.ts"
build() { deno run -A --unstable-worker-options --config "$core/deno.json" "$core/packages/app-build/cli.ts" "$@" -o "$out/dist" --minify; }
if [ "$selection" = "ALL" ]; then
  build --pack "$PWD/w6w-pack.json"
else
  for a in "${apps[@]}"; do build "$PWD/$a"; done
fi
printf '\nverify: ok\n'
