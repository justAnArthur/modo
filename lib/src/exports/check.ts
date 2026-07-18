// `modo check` — validate the user's project. the new world:
//   - tokens are .css files (parsed by the same code the runtime plugin
//     uses, but pulled into a helper exported from the lib so we can
//     reuse it without importing the vite plugin).
//   - items are .tsx files with a default export + TSDoc (parsed by
//     parseItemFile/parseItemSource).
//   - modo.config.ts is unchanged — it's still a TS file with a
//     default export.
//
// issues are reported with the file + a single line of text, so the
// CLI can print them like "✗ <file>" + "  <message>".

import { z } from 'zod'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import * as esbuild from 'esbuild'

import { siteConfigSchema } from './schema'
import { parseItemSource } from './tsdoc'
import { parseCss } from './css-parser'

interface Issue {
  file: string
  message: string
}

function flattenIssues(err: z.ZodError): string[] {
  return err.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
}

async function bundleTs(filePath: string, here: string): Promise<unknown> {
  const result = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    external: ['react', 'react-dom', 'modo-atomic-ui'],
    alias: { 'modo-atomic-ui': resolve(here, 'src', 'exports') },
    logLevel: 'silent',
  })
  const code = result.outputFiles?.[0]?.text
  if (!code) throw new Error('esbuild produced no output')
  const tmp = join(tmpdir(), `modo-check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mjs`)
  const fs = await import('node:fs/promises')
  await fs.writeFile(tmp, code)
  try {
    const mod = await import(tmp)
    return (mod as { default: unknown }).default
  } finally {
    await fs.unlink(tmp).catch(() => {})
  }
}

// minimal validation of a token group's CSS — not a full schema, just
// shape checks. CSS is loose by nature, but the lib downstream expects
// specific keys per group.
function validateTokenGroup(group: string, vars: { name: string; value: string; line: number }[]): string[] {
  const issues: string[] = []
  if (vars.length === 0) {
    // surfaces.css is allowed to be empty (the lib synthesizes the 8 levels).
    if (group !== 'surfaces') issues.push(`no --vars found`)
    return issues
  }
  for (const v of vars) {
    if (v.name === '') {
      issues.push(`line ${v.line}: empty --var name`)
      continue
    }
    const value = v.value.trim()
    if (!value) continue
    if (group === 'spacing' && !/^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(value)) {
      issues.push(`line ${v.line}: --${v.name} value "${value}" is not a length`)
    }
    if (group === 'motion') {
      // motion vars split into two groups: durations and easings. easings
      // start with `ease-` or are the literal `linear`; everything else
      // is a duration. we don't require a `motion-` prefix because the
      // convention is to keep token names short (e.g. --fast, --slow).
      const isEasing = v.name.startsWith('ease-') || v.name === 'linear'
      if (isEasing) {
        if (!/^(linear|cubic-bezier\(|steps\(|ease|ease-in|ease-out|ease-in-out)$/.test(value)) {
          issues.push(`line ${v.line}: --${v.name} value "${value}" is not a recognized easing`)
        }
      } else {
        if (!/^-?\d+(\.\d+)?\s*(ms|s)$/.test(value)) {
          issues.push(`line ${v.line}: --${v.name} value "${value}" is not a duration (use Nms or Ns)`)
        }
      }
    }
  }
  return issues
}

export async function runCheck(cwd: string, libRoot: string): Promise<{ ok: boolean; issues: Issue[] }> {
  const issues: Issue[] = []

  // 1. parse + validate modo.config.ts
  const configPath = resolve(cwd, 'modo.config.ts')
  let config: unknown = null
  try {
    config = await bundleTs(configPath, libRoot)
  } catch (e) {
    issues.push({ file: configPath, message: `failed to load: ${(e as Error).message}` })
  }
  if (config) {
    const r = siteConfigSchema.safeParse(config)
    if (!r.success) {
      for (const m of flattenIssues(r.error)) issues.push({ file: configPath, message: m })
    }
  }

  // 2. validate each .css in tokens/
  const tokensDir = resolve(cwd, 'tokens')
  let tokenFiles: string[] = []
  try {
    tokenFiles = await readdir(tokensDir)
  } catch {
    // tokens dir missing is OK — the lib synthesizes what it can
  }
  for (const f of tokenFiles) {
    if (!f.endsWith('.css')) {
      if (f.endsWith('.ts') || f.endsWith('.tsx')) {
        issues.push({ file: join(tokensDir, f), message: `tokens must be .css files (rename ${f} to ${f.replace(/\.tsx?$/, '.css')})` })
      }
      continue
    }
    const group = f.replace(/\.css$/, '')
    const filePath = join(tokensDir, f)
    let src: string
    try {
      src = await readFile(filePath, 'utf-8')
    } catch (e) {
      issues.push({ file: filePath, message: `failed to read: ${(e as Error).message}` })
      continue
    }
    const vars = parseCss(src)
    for (const issue of validateTokenGroup(group, vars)) {
      issues.push({ file: filePath, message: issue })
    }
  }

  // 3. validate each item file (primitives/components/blocks).
  for (const tier of ['primitives', 'components', 'blocks'] as const) {
    const tierDir = resolve(cwd, tier)
    let entries: string[] = []
    try {
      entries = await readdir(tierDir, { withFileTypes: true }).then((e) =>
        e.filter((x) => x.isDirectory()).map((x) => x.name)
      )
    } catch { /* tier dir missing — OK */ }
    for (const id of entries) {
      const filePath = join(tierDir, id, 'index.tsx')
      let raw: string
      try {
        raw = await readFile(filePath, 'utf-8')
      } catch (e) {
        issues.push({ file: filePath, message: `failed to read: ${(e as Error).message}` })
        continue
      }
      const parsed = parseItemSource(raw, filePath)
      for (const err of parsed.errors) issues.push({ file: filePath, message: err })
      if (!parsed.name) issues.push({ file: filePath, message: 'no default-exported function with a name' })
      if (!parsed.description) issues.push({ file: filePath, message: 'missing JSDoc description' })
      if (parsed.examples.length === 0) issues.push({ file: filePath, message: 'no @example blocks' })
    }
  }

  return { ok: issues.length === 0, issues }
}
