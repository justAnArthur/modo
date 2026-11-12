#!/usr/bin/env bash
# Lists what `npm publish` would ship for @justanarthur/modo-ui and fails when
# the entry, the stylesheet or a licence is missing. Run after `bun run build`.
set -euo pipefail

cd "$(dirname "$0")/../../ui"
files="$(npm pack --dry-run --json | node -e 'for (const f of JSON.parse(require("fs").readFileSync(0, "utf8"))[0].files) console.log(f.path)')"

for file in dist/index.js dist/index.d.ts dist/styles.css LICENSE; do
  grep -qx "$file" <<<"$files" || { echo "missing $file in the ui tarball" >&2; exit 1; }
  echo "ok $file"
done
echo "ui tarball ok ($(wc -l <<<"$files" | tr -d ' ') files)"
