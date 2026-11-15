/** `components` → `Components`. Content is capitalized, never by CSS. */
export function cap(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1)
}

/** `1 item`, `3 items`. */
export function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}
