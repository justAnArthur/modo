import { readFile } from 'node:fs/promises'
import type { ViteDevServer } from 'vite'

/** The slice of UnoCSS's public `UnocssVitePluginAPI` context used here; the lib doesn't depend on UnoCSS. */
interface UnoContext {
  tasks: Promise<unknown>[]
  filter(code: string, id: string): boolean
  extract(code: string, id: string): Promise<void>
}

/**
 * Hands a source file to every UnoCSS instance of the dev server. Uno extracts
 * from Vite's pipeline, which pre-bundled items bypass, and its
 * `content.filesystem` watcher only covers the files that existed at startup.
 */
export function unoExtractor(server: ViteDevServer): (file: string) => void {
  const contexts: UnoContext[] = server.config.plugins.filter(p => p.name === 'unocss:api').map(p => p.api.getContext())
  return file => {
    // A pending task: Uno's next stylesheet request waits for it.
    for (const uno of contexts) uno.tasks.push(extract(uno, file))
  }
}

async function extract(uno: UnoContext, file: string): Promise<void> {
  // The file may be gone by now, and a rejected task fails Uno's stylesheet.
  const code = await readFile(file, 'utf8').catch(() => null)
  if (code !== null && uno.filter(code, file)) await uno.extract(code, file)
}
