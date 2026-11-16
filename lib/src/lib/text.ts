/** `components` → `Components`. Content is capitalized, never by CSS. */
export function cap(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1)
}

/** A leading `01-` orders a guide or a group folder; slugs and titles drop it. */
export const ORDER_PREFIX = /^\d+-/

/** A file or folder name as a title: `02-form-controls` → `Form controls`. */
export function nameTitle(name: string): string {
  return cap(name.replace(ORDER_PREFIX, '').replaceAll('-', ' '))
}

/** `1 item`, `3 items`. */
export function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}
