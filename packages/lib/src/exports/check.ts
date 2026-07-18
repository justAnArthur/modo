// `modo check` — validate the user's project against the zod schemas.
// config + tokens only for now; item validation is a future phase.

import { z } from 'zod'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import * as esbuild from 'esbuild'

import {
  siteConfigSchema,
  colorGroupSchema,
  surfaceGroupSchema,
  genericTokenGroupSchema,
  type TokenGroup,
} from './schema'

interface Issue {
  file: string
  message: string
}

async function bundleTs(filePath: string, here: string): Promise<unknown> {
  const result = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    format: 'esm',
    write: false,
    platform: 'node',
    target: 'node20',
    external: ['react', 'react-dom', 'modo-atomic-ui'],
    alias: { 'modo-atomic-ui': resolve(here, 'src', 'exports') },
    logLevel: 'silent',
  })
  const code = result.outputFiles?.[0]?.text
  if (!code) throw new Error('esbuild produced no output')
  const tmp = resolve(here, `.modo-check-tmp-${Date.now()}.mjs`)
  const fs = await import('node:fs/promises')
  await fs.writeFile(tmp, code)
  const mod = await import(tmp)
  await fs.unlink(tmp).catch(() => {})
  return (mod as { default: unknown }).default
}

function flattenIssues(err: z.ZodError): string[] {
  return err.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
}

const GROUP_TO_SCHEMA: Partial<Record<TokenGroup, z.ZodTypeAny>> = {
  colors: colorGroupSchema,
  surfaces: surfaceGroupSchema,
  typography: genericTokenGroupSchema,
  spacing: genericTokenGroupSchema,
  radius: genericTokenGroupSchema,
  shadows: genericTokenGroupSchema,
  motion: genericTokenGroupSchema,
}

export async function runCheck(cwd: string, libRoot: string): Promise<{ ok: boolean; issues: Issue[] }> {
  const issues: Issue[] = []

  // 1. parse + validate modo.config.ts
  const configPath = resolve(cwd, 'modo.config.ts')
  let config: { tokens?: { source: string }; source?: { primitives: string; components: string; blocks: string } } | null = null
  try {
    config = (await bundleTs(configPath, libRoot)) as typeof config
  } catch (e) {
    issues.push({ file: configPath, message: `failed to load: ${(e as Error).message}` })
  }
  if (config) {
    const r = siteConfigSchema.safeParse(config)
    if (!r.success) {
      for (const m of flattenIssues(r.error)) issues.push({ file: configPath, message: m })
    } else if (r.data.tokens?.source) {
      // 2. validate each token group
      const tokensDir = resolve(cwd, r.data.tokens.source)
      let files: string[] = []
      try {
        files = await readdir(tokensDir)
      } catch (e) {
        issues.push({ file: tokensDir, message: `failed to read: ${(e as Error).message}` })
      }
      for (const f of files) {
        if (!f.endsWith('.ts') && !f.endsWith('.tsx')) continue
        const group = f.replace(/\.tsx?$/, '') as TokenGroup
        const schema = GROUP_TO_SCHEMA[group]
        if (!schema) {
          issues.push({ file: join(tokensDir, f), message: `unknown token group: ${group}` })
          continue
        }
        const filePath = join(tokensDir, f)
        let parsed: unknown
        try {
          parsed = await bundleTs(filePath, libRoot)
        } catch (e) {
          issues.push({ file: filePath, message: `failed to load: ${(e as Error).message}` })
          continue
        }
        const r2 = schema.safeParse(parsed)
        if (!r2.success) {
          for (const m of flattenIssues(r2.error)) issues.push({ file: filePath, message: m })
        }
      }
    }
  }

  return { ok: issues.length === 0, issues }
}
