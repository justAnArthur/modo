#!/usr/bin/env bun
import { spawn, execSync, type ChildProcess } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const DS_DIR = join(ROOT, 'design-systems')
const PEERS_FILE = join(ROOT, 'components', 'demo-switcher', '.peers.json')
const TEMP_CONFIG = '.modo.config.ts'

const wanted = process.argv.slice(2)
// Directory husks can outlive their tracked files (e.g. a merge deletes a
// DS but leaves .modo-tmp/); only dirs with a config are design systems.
const all = readdirSync(DS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(DS_DIR, e.name, 'modo.config.ts')))
  .map((e) => e.name)
const targets = wanted.length > 0 ? all.filter((n) => wanted.includes(n)) : all
if (targets.length === 0) {
  process.stderr.write(
    `no design systems found${wanted.length > 0 ? ` matching: ${wanted.join(', ')}` : ''}\n`,
  )
  process.stderr.write('usage: bun scripts/run-design-systems.ts [name ...]\n')
  process.exit(1)
}

// Kill any stale `modo dev` processes from a previous run that
// didn't clean up. Match the lib's `node .../modo dev` argv (not
// just `bunx modo`) since Vite orphans can outlive their bunx parent.
try {
  execSync("pkill -f 'modo dev' 2>/dev/null", { stdio: 'ignore' })
  execSync('sleep 0.5', { stdio: 'ignore' })
} catch {}

for (const e of readdirSync(DS_DIR, { withFileTypes: true })) {
  if (!e.isDirectory()) continue
  try { unlinkSync(join(DS_DIR, e.name, TEMP_CONFIG)) } catch {}
}

const items = [{ label: 'Switcher', component: '../../components/demo-switcher' }]
const splice = (source: string): string => {
  const i = source.lastIndexOf('}')
  if (i < 0) return source
  const head = source.slice(0, i)
  const tail = source.slice(i)
  const sep = /,\s*$/.test(head) ? '\n  ' : ',\n  '
  return head + sep + `panel: { items: ${JSON.stringify(items)} }\n` + tail
}

writeFileSync(
  PEERS_FILE,
  JSON.stringify(
    targets.map((name, i) => ({ name, url: `http://127.0.0.1:${5173 + i}/` })),
    null,
    2,
  ),
)

const children: ChildProcess[] = []
const cleanup = () => {
  for (const child of children) try { child.kill('SIGTERM') } catch {}
  for (const name of targets) try { unlinkSync(join(DS_DIR, name, TEMP_CONFIG)) } catch {}
  try { unlinkSync(PEERS_FILE) } catch {}
  process.exit(0)
}
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

for (let i = 0; i < targets.length; i++) {
  const name = targets[i]!
  const cwd = join(DS_DIR, name)
  const original = readFileSync(join(cwd, 'modo.config.ts'), 'utf-8')
  writeFileSync(join(cwd, TEMP_CONFIG), splice(original))
  const child = spawn('bunx', ['modo', 'dev', '--config', TEMP_CONFIG], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, MODO_PORT: String(5173 + i) },
  })
  children.push(child)
}
