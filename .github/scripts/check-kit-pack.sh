#!/usr/bin/env bash
# check-ui-pack.sh for a kit (kits/<name>, default ai): lists what
# `npm publish` would ship and fails when the entry, its types, the
# stylesheet, the licence or an item source a modo host documents from
# (`source` condition) is missing, then runs the kit's dist check (every
# exports entry has its JS and .d.ts and loads in Node, its source ships with
# every file it reaches; "use client" only on client chunks; one instance per
# context). Run after `bun run build`.
set -euo pipefail

kit="${1:-ai}"
cd "$(dirname "$0")/../../kits/$kit"
files="$(npm pack --dry-run --json | node -e 'for (const f of JSON.parse(require("fs").readFileSync(0, "utf8"))[0].files) console.log(f.path)')"

for file in dist/index.js dist/index.d.ts dist/styles.css LICENSE README.md index.ts; do
  grep -qx "$file" <<<"$files" || { echo "missing $file in the $kit kit tarball" >&2; exit 1; }
  echo "ok $file"
done
node --input-type=module -e "await import('./dist/index.js')" || { echo "dist/index.js does not load" >&2; exit 1; }
echo "ok dist/index.js loads"
bun scripts/check-dist.ts
echo "$kit kit tarball ok ($(wc -l <<<"$files" | tr -d ' ') files)"
