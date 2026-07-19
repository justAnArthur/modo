// shared helpers for the runtime vite plugins.
//
// exports:
//   - bundleUserItem(entry, opts): esbuild-bundle a user's .tsx/.ts
//     file into a tmp .mjs we can statically import. CSS imports
//     in the user's file are stripped (loader: 'empty'); the items
//     plugin handles CSS via a separate virtual module. returns
//     the path to the tmp .mjs, or null on failure.
//
// `loadModoConfig` lives in `lib/src/exports/modo-config.ts` so it
// can be shared with the CLI tools (check.ts, cli.ts) without
// crossing the exports → runtime boundary.
//
// both helpers use os.tmpdir() and unique filenames so concurrent
// dev sessions and HMR reloads don't collide.

import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as esbuild from 'esbuild'

function tmpPath(prefix: string, ext = '.mjs'): string {
  return join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
}

async function safeUnlink(p: string): Promise<void> {
  try { await unlink(p) } catch { /* already gone */ }
}

interface BundleItemOptions {
  // tmp-file name prefix. the items plugin passes 'item-N', the
  // components plugin passes 'cmp-Select' (etc) so the two streams
  // don't collide.
  prefix: string
}

export async function bundleUserItem(
  entry: string,
  opts: BundleItemOptions,
): Promise<{ path: string; code: string } | null> {
  const tmp = tmpPath(opts.prefix)
  try {
    const result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      jsx: 'automatic',
      outfile: tmp,
      loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx', '.js': 'js', '.css': 'empty' },
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      logLevel: 'silent',
    })
    const code = result.outputFiles?.[0]?.text
    if (!code) return null
    await writeFile(tmp, code)
    return { path: tmp, code }
  } catch {
    await safeUnlink(tmp)
    return null
  }
}
