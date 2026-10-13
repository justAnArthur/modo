/*
 * Local addition (not part of Fluid Functionalism): the pure helpers behind
 * FileDropzone and its rows (size formatting, the accept / size / count
 * checks). No React: the build makes this an entry of its own without
 * `"use client"`, so server code can call them.
 */

const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const

/** A byte count as a short localized size: `512 B`, `1.5 MB` (decimal units, as file managers show them). */
export function formatFileSize(bytes: number, locale?: Intl.LocalesArgument) {
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000
    unit++
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value)
}

/** Why a file was turned away: its `type` is not in `accept`, its `size` is over `maxSize`, or it is past the `count` of `maxFiles`. */
export type FileRejectionReason = 'type' | 'size' | 'count'

/** A file the dropzone turned away, and why. */
export interface FileRejection {
  file: File
  reason: FileRejectionReason
}

function rules(accept: string) {
  return accept
    .split(',')
    .map(rule => rule.trim().toLowerCase())
    .filter(Boolean)
}

function matches(rule: string, name: string, type: string) {
  if (rule.startsWith('.')) return name.endsWith(rule)
  if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
  return type === rule
}

/** Whether a file passes an `accept` list (`.pdf,image/*`), as the native file input reads it. */
export function acceptsFile(file: { name: string; type: string }, accept?: string) {
  if (!accept) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return rules(accept).some(rule => matches(rule, name, type))
}

/** What a drag over the zone will come to: every file taken, some taken and some turned away, or none taken. */
export type DragVerdict = 'accept' | 'partial' | 'reject'

/**
 * Judges dragged files while they are still in the air. A drag shows MIME
 * types but no names, so a type the drag leaves empty, or an `accept` list
 * with extensions, counts as passing until the drop sorts the files. `limit`
 * is how many one drop may add.
 */
export function dragVerdict(types: string[], accept: string | undefined, limit: number): DragVerdict {
  const list = accept ? rules(accept) : []
  const unsure = !list.length || list.some(rule => rule.startsWith('.'))
  const passing = types.filter(type => unsure || !type || list.some(rule => matches(rule, '', type.toLowerCase())))
  if (!passing.length || limit < 1) return 'reject'
  return passing.length === types.length && types.length <= limit ? 'accept' : 'partial'
}

interface SortOptions {
  accept?: string
  maxSize?: number
  maxFiles?: number
  multiple?: boolean
}

/** Splits picked or dropped files into the ones that pass `accept`, `maxSize` and the count, and the rest with a reason. */
export function sortFiles(files: File[], { accept, maxSize, maxFiles, multiple }: SortOptions) {
  const accepted: File[] = []
  const rejected: FileRejection[] = []
  const limit = multiple ? (maxFiles ?? Number.POSITIVE_INFINITY) : 1

  for (const file of files) {
    if (!acceptsFile(file, accept)) rejected.push({ file, reason: 'type' })
    else if (maxSize != null && file.size > maxSize) rejected.push({ file, reason: 'size' })
    else if (accepted.length >= limit) rejected.push({ file, reason: 'count' })
    else accepted.push(file)
  }

  return { accepted, rejected }
}
