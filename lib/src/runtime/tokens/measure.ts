import type { Var } from './parts'

function root(): CSSStyleDeclaration {
  return getComputedStyle(document.documentElement)
}

/** The token's declared value with its var() references already substituted. */
export function resolved(name: string, fallback = ''): string {
  return root().getPropertyValue(name).trim() || fallback
}

let ruler: HTMLElement | undefined

/**
 * The token's length in px: the parser's when it could size it, else the
 * browser's (calc(), var() chains). Null when the value isn't a length.
 */
export function lengthOf(v: Var): number | null {
  if (v.swatch?.kind === 'length' || v.swatch?.kind === 'font-size') return v.swatch.px
  if (!CSS.supports('width', resolved(v.name, v.value))) return null
  if (!ruler) {
    ruler = document.createElement('i')
    ruler.style.cssText = 'display:block;position:absolute;visibility:hidden;block-size:0'
  }
  if (!ruler.isConnected) document.body.append(ruler)
  ruler.style.inlineSize = `var(${v.name})`
  return parseFloat(getComputedStyle(ruler).width)
}
