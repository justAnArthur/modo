import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createGenerator } from 'unocss'
import { COMPONENT_DIRS, theme, utilities } from '../preset'
import config from '../uno.config'

// The package's stylesheets, after bunup has written dist/. Two ways in:
// - styles.css: everything prebuilt, the utilities included.
// - base.css (plus tailwind.css or the UnoCSS preset): tokens and base styles
//   only, so the host's own Tailwind or UnoCSS generates the utilities from
//   the scanned dist/*.js, once, beside its own.

type Tree = string | { [key: string]: Tree }

const ROOT = join(import.meta.dirname, '..')
const DIST = join(ROOT, 'dist')

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
const itemCss = glob('{primitives,components,blocks}/**/*.css')
const base = [tokens, ...['base.css', ...itemCss].map(read)].map(hoist).join('\n')
const head = [...imports].join('')

const uno = await createGenerator(config)
const code = glob(`dist/{${COMPONENT_DIRS.join(',')}}/**/*.js`)
  .map(read)
  .join('\n')
const { css: generated } = await uno.generate(code)

function themeVars() {
  const vars: string[] = []
  const flatten = (prefix: string, value: Tree) => {
    if (typeof value === 'string') {
      vars.push(`  ${prefix}: ${value};`)
      return
    }
    for (const [key, inner] of Object.entries(value)) flatten(key === 'DEFAULT' ? prefix : `${prefix}-${key}`, inner)
  }
  flatten('--color', theme.colors)
  flatten('--shadow', theme.shadow)
  flatten('--drop-shadow', theme.dropShadow)
  return vars.join('\n')
}

function tailwindUtility([name, decls]: [string, Record<string, string>]) {
  // wind4's --un-duration is Tailwind's --tw-duration
  const body = Object.entries(decls).map(([prop, value]) => `  ${prop.replace(/^--un-/, '--tw-')}: ${value};`)
  return `@utility ${name} {\n${body.join('\n')}\n}`
}

const tailwind = [
  '/* @justanarthur/modo-ui for Tailwind CSS v4: import after `@import "tailwindcss"`. */',
  '@import "./base.css";',
  ...COMPONENT_DIRS.map(dir => `@source "./${dir}";`),
  // The components are written against a `.dark` ancestor, as upstream FF.
  '@custom-variant dark (&:is(.dark *));',
  // inline: a token is read where it is used, never re-emitted under its own name.
  `@theme inline {\n${themeVars()}\n}`,
  ...Object.entries(utilities).map(tailwindUtility),
  '',
].join('\n\n')

const write = (name: string, css: string) => writeFileSync(join(DIST, name), css)
write('tokens.css', tokens)
write('base.css', head + base)
write('styles.css', `${head}${generated}\n${base}`)
write('tailwind.css', tailwind)
