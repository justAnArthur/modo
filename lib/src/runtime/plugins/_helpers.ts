// shared helpers for the runtime vite plugins.
//
// exports:
//   - bundleUserItem(entry, opts): esbuild-bundle a user's .tsx/.ts
//     file into a tmp .mjs we can statically import. CSS imports
//     in the user's file are stripped (loader: 'empty'); the items
//     plugin handles CSS via a separate virtual module, no
//     string concat, no <style dangerouslySetInnerHTML>.
//
// `loadModoConfig` lives in `lib/src/exports/config.loader.ts` so it
// can be shared with the CLI tools (check.ts, cli.ts) without
// crossing the exports → runtime boundary.
//
// both helpers write to `<root>/.modo-tmp/` when a root is provided
// (and to os.tmpdir() otherwise). keeping the output inside the
// project root matters when the item bundle has external imports
// (e.g. the user's `admin/components/elevated.tsx`): esbuild emits
// those imports as relative paths from the output to the source,
// and a 5-level `../../../../..` hop from os.tmpdir() produces a
// path Vite can't resolve under the dev server's fs.allow policy.

import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import * as esbuild from 'esbuild'

function tmpName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mjs`
}

async function safeUnlink(p: string): Promise<void> {
  try { await unlink(p) } catch { /* already gone */ }
}

interface BundleItemOptions {
  // tmp-file name prefix. the items plugin passes 'item-N', the
  // components plugin passes 'cmp-Select' (etc) so the two streams
  // don't collide.
  prefix: string
  // user's project root. when set and admin/components/elevated.tsx
  // exists, the file is marked external so the item bundle imports
  // it from the same module instance the lib's runtime uses (via
  // virtual:modo-elevated). without this, esbuild inlines the
  // elevation primitives into every item bundle, giving each item
  // its own `SurfaceContext` and breaking the provider chain.
  // also drives the output directory (see file header).
  root?: string
}

export async function bundleUserItem(
  entry: string,
  opts: BundleItemOptions,
): Promise<{ path: string } | null> {
  const outDir = opts.root
    ? join(opts.root, '.modo-tmp')
    : tmpdir()
  if (opts.root && !existsSync(outDir)) {
    await mkdir(outDir, { recursive: true })
  }
  const outPath = join(outDir, tmpName(opts.prefix))

  const elevatedPath = opts.root
    ? resolve(opts.root, 'admin/components/elevated.tsx')
    : null
  // esbuild leaves external imports as-is in the output. we match both
  // the .tsx path and the extensionless form because esbuild can hand
  // us either depending on how the import was written.
  const externals: string[] = ['react', 'react-dom', 'react/jsx-runtime']
  if (elevatedPath) {
    externals.push(elevatedPath, elevatedPath.replace(/\.tsx$/, ''))
  }

  try {
    const result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      jsx: 'automatic',
      outfile: outPath,
      loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx', '.js': 'js', '.css': 'empty' },
      external: externals,
      logLevel: 'silent',
    })
    if (!result.outputFiles?.[0]?.text) return null
    await writeFile(outPath, result.outputFiles[0].text)
    return { path: outPath }
  } catch {
    await safeUnlink(outPath)
    return null
  }
}
