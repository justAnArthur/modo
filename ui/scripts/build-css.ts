import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createGenerator } from 'unocss'
import { theme, utilities } from '../preset'
import config from '../uno.config'

// The package's stylesheets, after bunup has written dist/. Two ways in:
// - styles.css: everything prebuilt, the utilities included.
// - base.css (plus tailwind.css or the UnoCSS preset): tokens and base styles
//   only, so the host's own Tailwind or UnoCSS generates the utilities from
//   the scanned dist/*.js, once, beside its own.

const ROOT = join(import.meta.dirname, '..')
const DIST = join(ROOT, 'dist')
const COMPONENT_DIRS = ['shared', 'primitives', 'components', 'blocks']

const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
const glob = (pattern: string) => globSync(pattern, { cwd: ROOT }).sort()

// @import must lead the file, ahead of any layer block.
const IMPORT = /^@import [^;]+;\n/gm
const imports = new Set<string>()
const hoist = (css: string) => {
  for (const [line] of css.matchAll(IMPORT)) imports.add(line)
  return css.replace(IMPORT, '')
}

const tokens = glob('tokens/*.css').map(read).join('\n')
const base = [tokens, ...['base.css', ...glob('{primitives,components,blocks}/**/*.css')].map(read)]
  .map(hoist)
  .join('\n')
const head = [...imports].join('')

const uno = await createGenerator(config)
const code = ['dist/index.js', ...glob(`dist/{${COMPONENT_DIRS.join(',')}}/**/*.js`)].map(read).join('\n')
const { css: generated } = await uno.generate(code, { preflights: true })

function tailwind() {
  const vars: string[] = []
  const flatten = (prefix: string, value: string | Record<string, unknown>) => {
    if (typeof value === 'string') return vars.push(`  ${prefix}: ${value};`)
    for (const [key, inner] of Object.entries(value))
      flatten(key === 'DEFAULT' ? prefix : `${prefix}-${key}`, inner as string | Record<string, unknown>)
  }
  flatten('--color', theme.colors)
  flatten('--shadow', theme.shadow)
  flatten('--drop-shadow', theme.dropShadow)

  const rules = Object.entries(utilities).map(([name, decls]) => {
    const body = Object.entries(decls)
      .map(([prop, value]) => `  ${prop.replace(/^--un-/, '--tw-')}: ${value};`)
      .join('\n')
    return `@utility ${name} {\n${body}\n}`
  })

  return [
    '/* @justanarthur/modo-ui for Tailwind CSS v4: import after `@import "tailwindcss"`. */',
    '@import "./base.css";',
    ...['index.js', ...COMPONENT_DIRS].map(dir => `@source "./${dir}";`),
    // The components are written against a `.dark` ancestor, as upstream FF.
    '@custom-variant dark (&:is(.dark *));',
    // inline: a token is read where it is used, never re-emitted under its own name.
    `@theme inline {\n${vars.join('\n')}\n}`,
    ...rules,
    '',
  ].join('\n\n')
}

const write = (name: string, css: string) => writeFileSync(join(DIST, name), css)
write('tokens.css', tokens)
write('base.css', head + base)
write('styles.css', `${head}${generated}\n${base}`)
write('tailwind.css', tailwind())
