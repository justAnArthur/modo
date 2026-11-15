#!/usr/bin/env bash
# Packs @justanarthur/modo as npm would publish it, scaffolds a project with the
# packed CLI, installs the tarball into it and builds the docs site.
# Run from anywhere: .github/scripts/smoke-init.sh (KEEP=1 keeps the temp dir).
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
work="$(mktemp -d)"
if [ -z "${KEEP:-}" ]; then trap 'rm -rf "$work"' EXIT; fi

echo "==> build and pack lib"
(cd "$root/lib" && bun run build >/dev/null)
tarball="$work/$(cd "$root/lib" && npm pack --silent --pack-destination "$work" | tail -n 1)"
echo "    $tarball"

echo "==> modo init smoke"
cd "$work"
npx --yes --package "$tarball" -- modo init smoke
test -f smoke/.gitignore
test ! -e smoke/_gitignore
grep -q '"@justanarthur/modo": "\^' smoke/package.json

echo "==> install the tarball"
cd smoke
npm install --silent --no-audit --no-fund "$tarball"

echo "==> modo build"
npx modo build

echo "==> assert the output"
for file in dist/index.html dist/404.html dist/docs/primitives/button/index.html dist/canvas/index.html; do
  test -f "$file" || { echo "missing $file" >&2; exit 1; }
  echo "    ok $file"
done
echo "smoke ok"
