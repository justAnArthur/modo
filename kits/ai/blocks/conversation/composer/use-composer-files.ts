/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see ui/PORTING.md.
 */

'use client'

import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { type ChangeEvent, type DragEvent, useCallback, useMemo, useRef, useState } from 'react'

// A stable seed: a fresh literal per render would churn the stored identity.
const NO_FILES: File[] = []

interface ComposerFilesOptions {
  files: File[] | undefined
  defaultFiles: File[] | undefined
  onFilesChange: ((files: File[]) => void) | undefined
  accept: string
  maxFiles: number | undefined
  disabled: boolean | undefined
}

// Unique enough to catch the same file dropped twice; different bytes mean a different size.
const fingerprint = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

function matchesAccept(file: File, tokens: string[]) {
  return tokens.some(token => {
    if (token.endsWith('/*')) return file.type.startsWith(token.slice(0, -1))
    if (token.startsWith('.')) return file.name.toLowerCase().endsWith(token.toLowerCase())
    return file.type === token
  })
}

/** The composer's attachments: the list both ways, the hidden picker, and drag-and-drop. */
export function useComposerFiles({
  files,
  defaultFiles,
  onFilesChange,
  accept,
  maxFiles,
  disabled,
}: ComposerFilesOptions) {
  const supported = onFilesChange !== undefined || defaultFiles !== undefined
  const [list, setList] = useControllableState<File[]>(files, defaultFiles ?? NO_FILES, onFilesChange)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const acceptTokens = useMemo(
    () =>
      accept
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    [accept],
  )

  const replace = useCallback(
    (next: File[]) => {
      if (!supported) return
      setList(maxFiles != null ? next.slice(0, maxFiles) : next)
    },
    [supported, setList, maxFiles],
  )

  const add = useCallback(
    (incoming: File[]) => {
      const seen = new Set(list.map(fingerprint))
      const accepted = incoming.filter(file => {
        if (!matchesAccept(file, acceptTokens) || seen.has(fingerprint(file))) return false
        seen.add(fingerprint(file))
        return true
      })
      if (accepted.length) replace([...list, ...accepted])
    },
    [list, acceptTokens, replace],
  )

  const remove = useCallback((index: number) => replace(list.filter((_, i) => i !== index)), [list, replace])

  const openPicker = useCallback(
    (acceptOverride?: string) => {
      const el = inputRef.current
      if (!el) return
      if (!acceptOverride) {
        el.click()
        return
      }
      // The dialog reads `accept` synchronously, so the override can be undone right after.
      el.accept = acceptOverride
      el.click()
      queueMicrotask(() => {
        if (inputRef.current) inputRef.current.accept = accept
      })
    },
    [accept],
  )

  const dropHandlers = {
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!supported || disabled || !Array.from(e.dataTransfer.types).includes('Files')) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDragOver(true)
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      const next = e.relatedTarget as Node | null
      if (next && e.currentTarget.contains(next)) return
      setDragOver(false)
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      setDragOver(false)
      if (!supported || disabled) return
      add(Array.from(e.dataTransfer.files))
    },
  }

  const inputProps = {
    ref: inputRef,
    type: 'file',
    accept,
    multiple: maxFiles == null || maxFiles > 1,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return
      add(Array.from(e.target.files))
      e.target.value = '' // so the same file can be picked again
    },
  }

  return {
    supported,
    controlled: files !== undefined,
    files: list,
    dragging: supported && dragOver,
    add,
    replace,
    remove,
    openPicker,
    dropHandlers,
    inputProps,
  }
}
