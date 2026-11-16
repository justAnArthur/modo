import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createGenerator } from 'unocss'
import { shapeMap } from '../lib/shape-classes'
import config from '../uno.config'

const uno = await createGenerator(config)
const radiusCss = readFileSync(new URL('../tokens/radius.css', import.meta.url), 'utf8')
const tokens: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(uno.config.theme.radius ?? {}).map(([key, value]) => [`--radius-${key}`, value]),
  ),
  ...Object.fromEntries(
    [...radiusCss.matchAll(/(--radius-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value]),
  ),
}

async function px(className: string) {
  const { css } = await uno.generate(className, { preflights: false })
  const token = css.match(/border-radius:var\((--radius-[\w-]+)\)/)?.[1] ?? ''
  const value = tokens[token] ?? ''
  return value.endsWith('rem') ? Number.parseFloat(value) * 16 : Number.parseFloat(value)
}

describe('shapeMap', () => {
  for (const shape of Object.values(shapeMap)) {
    test(`${shape.variant}: the numeric radii match the classes`, async () => {
      expect(await px(shape.bg)).toBe(shape.bgRadius)
      expect(await px(shape.mergedBg)).toBe(shape.mergedRadius)
      expect(await px(shape.focusRing)).toBe(shape.bgRadius + 2)
    })
  }
})
