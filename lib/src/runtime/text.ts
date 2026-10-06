/** `components` → `Components`. Content is capitalized, never by CSS. */
export function cap(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1)
}
