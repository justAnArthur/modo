#!/usr/bin/env bun
import { spawn, type ChildProcess } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const DS_DIR = join(ROOT, 'design-systems')
const PEERS_FILE = join(ROOT, 'components', 'demo-switcher', '.peers.json')
const TEMP_CONFIG = '.modo.config.ts'

const wanted = process.argv.slice(2)
const all = readdirSync(DS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
const targets = wanted.length > 0 ? all.filter((n) => wanted.includes(n)) : all
if (targets.length === 0) {
  process.stderr.write(
    `no design systems found${wanted.length > 0 ? ` matching: ${wanted.join(', ')}` : ''}\n`,
  )
  process.stderr.write('usage: bun scripts/run-design-systems.ts [name ...]\n')
  process.exit(1)
}

for (const e of readdirSync(DS_DIR, { withFileTypes: true })) {
  if (!e.isDirectory()) continue
  try { unlinkSync(join(DS_DIR, e.name, TEMP_CONFIG)) } catch {}
}

const items = [{ label: 'Switcher', component: '../components/demo-switcher' }]
const splice = (source: string): string => {
  const i = source.lastIndexOf('}')
  if (i < 0) return source
  return source.slice(0, i) + `,\n  panel: { items: ${JSON.stringify(items)} }\n` + source.slice(i)
}

writeFileSync(
  PEERS_FILE,
  JSON.stringify(
    targets.map((name, i) => ({ name, url: `http://localhost:${5173 + i}/` })),
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
