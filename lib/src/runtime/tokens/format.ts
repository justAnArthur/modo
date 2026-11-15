/* Pure formatting for the foundation pages: no DOM, so the tests can import it. */

const ROOT_PX = 16
const PILL = 1000

/** `12` → `12px`, `0.5` → `0.5px`: at most two decimals, trailing zeros dropped. */
export function px(n: number): string {
  return `${round(n, 2)}px`
}

/** `12` → `0.75rem`: at most four decimals, trailing zeros dropped. */
export function rem(n: number): string {
  return `${round(n / ROOT_PX, 4)}rem`
}

/** The declared value, then whichever of px and rem it isn't already:
    `0.25rem` → `0.25rem · 4px`, `calc(…)` → `calc(…) · 6px · 0.375rem`. */
export function lengthMeta(value: string, size: number | null): string {
  if (size === null) return value
  // A pill sentinel (`9999px`) reads as nothing in rem.
  const parts = size < PILL ? [value, px(size), rem(size)] : [value, px(size)]
  return parts.filter((p, i) => parts.indexOf(p) === i).join(' · ')
}

/** `4px to 32px`, or null when fewer than two distinct sizes are known. */
export function range(sizes: Array<number | null>): string | null {
  const known = sizes.filter(s => s !== null)
  if (known.length < 2) return null
  const [lo, hi] = [Math.min(...known), Math.max(...known)]
  return lo === hi ? null : `${px(lo)} to ${px(hi)}`
}

/** The family a stack asks for first: `"Inter Variable", ui-sans-serif` → `Inter Variable`. */
export function primaryFamily(stack: string): string {
  return stack
    .split(',')[0]!
    .trim()
    .replace(/^(["'])(.*)\1$/, '$2')
}

/** Up to `n` items evenly across the list, ends included. */
export function spread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))]!)
}

function round(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)))
}
