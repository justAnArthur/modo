#!/usr/bin/env node
// dual-publish hook: invoked by bun's `postpublish` lifecycle after the
// primary npm publish completes. swaps .npmrc to point at
// npm.pkg.github.com, runs `bun publish --ignore-scripts` so we don't
// recurse, restores the original .npmrc.
//
// why --ignore-scripts: bun publish re-invokes postpublish. without the
// flag we'd loop forever. the --access public flag is passed so scoped
// private packages still work.
//
// scoped packages: when the package name is scoped (e.g. @justanarthur/modo)
// we read the scope from package.json and write the scoped registry mapping
// @scope:registry=... so npm/bun routes the package to GitHub Packages
// instead of trying to fall through to npmjs.com.
//
// failure mode: if GH_TOKEN is unset, or the inner bun publish exits
// non-zero, this script exits non-zero. npm has already published at
// that point — recover by re-running publish-npm-on-tag.yml via
// workflow_dispatch for the same tag.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const REGISTRY = 'https://npm.pkg.github.com/'
const dryRun = process.argv.includes('--dry-run')

if (!process.env.GH_TOKEN && !dryRun) {
  console.error('GH_TOKEN is not set — refusing to publish')
  process.exit(1)
}

// detect scope from package.json (e.g. "@justanarthur/modo" → scope "@justanarthur")
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const scopeMatch = pkg.name?.match(/^(@[^/]+)\//)
const scope = scopeMatch ? scopeMatch[1] : null

const npmrcPath = '.npmrc'
const backupPath = '.npmrc.bak'
const original = existsSync(npmrcPath) ? readFileSync(npmrcPath, 'utf8') : null

function restore() {
  if (original !== null) writeFileSync(npmrcPath, original)
  else if (existsSync(npmrcPath)) unlinkSync(npmrcPath)
  if (existsSync(backupPath)) unlinkSync(backupPath)
}

console.log(`→ dual-publish: npm + ${REGISTRY}${scope ? ` (scope: ${scope})` : ''}`)

if (dryRun) {
  console.log('  npm:      bun publish -p --access public  (already ran)')
  console.log(`  github:   bun publish --ignore-scripts --access public --registry ${REGISTRY}`)
  console.log(`  scope:    ${scope || '(unscoped)'}`)
  console.log('  GH_TOKEN: ' + (process.env.GH_TOKEN ? 'set' : 'MISSING (would fail)'))
  process.exit(0)
}

try {
  writeFileSync(backupPath, original ?? '')
  const lines = [`registry=${REGISTRY}`]
  if (scope) lines.push(`${scope}:registry=${REGISTRY}`)
  lines.push(`//npm.pkg.github.com/:_authToken=${process.env.GH_TOKEN}`)
  writeFileSync(npmrcPath, lines.join('\n') + '\n')
  execFileSync('bun', ['publish', '--ignore-scripts', '--access', 'public'], { stdio: 'inherit' })
} finally {
  restore()
}
