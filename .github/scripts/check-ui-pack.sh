#!/usr/bin/env bash
# Lists what `npm publish` would ship for @justanarthur/modo-ui and fails when
# the entry, the stylesheet, a licence or the item sources a modo host documents
# from (`source` condition) are missing, then runs ui's dist check
# (every exports entry has its JS and .d.ts and loads in Node, and its source
# ships with every file it reaches; "use client" only on client chunks; one
# instance per context). Run after `bun run build`.
set -euo pipefail

cd "$(dirname "$0")/../../ui"
files="$(npm pack --dry-run --json | node -e 'for (const f of JSON.parse(require("fs").readFileSync(0, "utf8"))[0].files) console.log(f.path)')"

for file in dist/index.js dist/index.d.ts dist/styles.css LICENSE components/button/index.tsx components/button/examples.mdx; do
  grep -qx "$file" <<<"$files" || { echo "missing $file in the ui tarball" >&2; exit 1; }
  echo "ok $file"
done
# The package root must load: a tree-shaking slip once left the barrel exporting names it never bound.
node --input-type=module -e "await import('./dist/index.js')" || { echo "dist/index.js does not load" >&2; exit 1; }
echo "ok dist/index.js loads"
bun scripts/check-dist.ts
echo "ui tarball ok ($(wc -l <<<"$files" | tr -d ' ') files)"
