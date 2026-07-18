import type { Plugin, ViteDevServer } from 'vite'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import * as esbuild from 'esbuild'
import {
  colorGroupSchema,
  surfaceGroupSchema,
} from '../../exports/schema'

export interface TokensPluginOptions {
  root: string
}

interface DiscoveredGroup {
  name: string
  raw: unknown
  errors: string[]
}

async function parseTokenFile(path: string): Promise<unknown | null> {
  const raw = await readFile(path, 'utf-8')
  // extract the default export. matches:
  //   export default defineTokens({ ... })
  //   export default defineSurfaces({ ... })
  const m = raw.match(/export\s+default\s+define(?:Tokens|Surfaces)\s*\(([\s\S]*?)\)\s*;?\s*$/)
  if (!m) return null
  const body = (m[1] ?? '').trim()
  // wrap as a default export so we can evaluate
  const wrapped = `const __cfg = ${body};\nexport default __cfg;`
  const result = await esbuild.transform(wrapped, {
    loader: path.endsWith('.tsx') ? 'tsx' : 'ts',
    format: 'esm',
  })
  // write to a temp file so dynamic import can evaluate it
  const tmp = join(process.cwd(), `.modo-token-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`)
  try {
    await (await import('node:fs/promises')).writeFile(tmp, result.code)
    const mod = await import(tmp + '?t=' + Date.now())
    return (mod as { default: unknown }).default
  } finally {
    await (await import('node:fs/promises')).unlink(tmp).catch(() => {})
  }
}

async function discoverTokens(root: string): Promise<{ groups: DiscoveredGroup[]; errors: string[] }> {
  const errors: string[] = []
  const groups: DiscoveredGroup[] = []
  const tokensDir = join(root, 'tokens')
  let files: string[] = []
  try {
    files = await readdir(tokensDir)
  } catch {
    errors.push(`tokens directory not found at ${tokensDir}`)
    return { groups, errors }
  }

  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue
    const name = file.replace(/\.tsx?$/, '')
    const fullPath = join(tokensDir, file)
    try {
      const parsed = await parseTokenFile(fullPath)
      if (parsed == null) continue

      const groupErrors: string[] = []
      if (name === 'colors') {
        const r = colorGroupSchema.safeParse(parsed)
        if (!r.success) groupErrors.push(...r.error.issues.map((i) => i.message))
      } else if (name === 'surfaces') {
        const r = surfaceGroupSchema.safeParse(parsed)
        if (!r.success) groupErrors.push(...r.error.issues.map((i) => i.message))
      }
      // typography / spacing / radius / motion are untyped for phase 1 — the renderer
      // iterates generically. zod schemas for them land in phase 2.

      groups.push({ name, raw: parsed, errors: groupErrors })
    } catch (e) {
      errors.push(`failed to parse ${file}: ${(e as Error).message}`)
    }
  }

  return { groups, errors }
}

function buildCss(groups: DiscoveredGroup[]): string {
  const lines: string[] = [':root {']
  for (const g of groups) {
    const data = g.raw as Record<string, unknown>
    if (g.name === 'colors' && data.items) {
      const items = data.items as Record<string, { value: string }>
      for (const [name, token] of Object.entries(items)) {
        const cssVar = '--' + name.replace(/_/g, '-')
        lines.push(`  ${cssVar}: ${token.value};`)
      }
    } else if (g.name === 'surfaces' && data.levels) {
      const levels = data.levels as Record<string, { bg: string; shadow: string }>
      for (const [n, lvl] of Object.entries(levels)) {
        lines.push(`  --surface-${n}: var(--${lvl.bg.replace(/_/g, '-')});`)
        lines.push(`  --shadow-${n}: var(--${lvl.shadow.replace(/_/g, '-')});`)
      }
    } else if (g.name === 'typography' && data.families) {
      const families = data.families as Record<string, string>
      for (const [name, value] of Object.entries(families)) {
        lines.push(`  --font-${name}: ${value};`)
      }
    } else if (g.name === 'spacing' && data.scale) {
      const scale = data.scale as Record<string, { value: string }>
      for (const [name, tok] of Object.entries(scale)) {
        const cssVar = '--space-' + name.replace(/_/g, '-')
        lines.push(`  ${cssVar}: ${tok.value};`)
      }
    } else if (g.name === 'radius' && data.scale) {
      const scale = data.scale as Record<string, { value: string }>
      for (const [name, tok] of Object.entries(scale)) {
        const cssVar = '--radius-' + name.replace(/_/g, '-')
        lines.push(`  ${cssVar}: ${tok.value};`)
      }
    } else if (g.name === 'motion' && data.durations) {
      const durations = data.durations as Record<string, { value: string }>
      for (const [name, tok] of Object.entries(durations)) {
        const cssVar = '--motion-' + name.replace(/_/g, '-')
        lines.push(`  ${cssVar}: ${tok.value};`)
      }
    } else if (g.name === 'motion' && data.easings) {
      const easings = data.easings as Record<string, { value: string }>
      for (const [name, tok] of Object.entries(easings)) {
        const cssVar = '--ease-' + name.replace(/_/g, '-')
        lines.push(`  ${cssVar}: ${tok.value};`)
      }
    }
  }
  lines.push('}')
  return lines.join('\n') + '\n'
}

function buildJsonModule(groups: DiscoveredGroup[], errors: string[]): string {
  const tokensByName: Record<string, unknown> = {}
  for (const g of groups) tokensByName[g.name] = g.raw
  return [
    `export const tokens = ${JSON.stringify(tokensByName)};`,
    `export const errors = ${JSON.stringify(errors)};`,
    `export const css = ${JSON.stringify(buildCss(groups))};`,
  ].join('\n')
}

const VIRTUAL_ID = 'virtual:modo-tokens'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

export function tokensPlugin(options: TokensPluginOptions): Plugin {
  let server: ViteDevServer | null = null

  return {
    name: 'modo-atomic-ui:tokens',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
      return null
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null
      const { groups, errors } = await discoverTokens(options.root)
      return buildJsonModule(groups, errors)
    },

    configureServer(s) {
      server = s
    },

    async handleHotUpdate(ctx) {
      if (ctx.file.startsWith(join(options.root, 'tokens'))) {
        const mod = server?.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID)
        if (mod) server!.moduleGraph.invalidateModule(mod)
        return []
      }
      return
    },
  }
}
