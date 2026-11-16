/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/file-thumbnail.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see ui/PORTING.md.
 */

'use client'

import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { useEffect, useState } from 'react'

// pdfjs-dist is an optional peer, loaded on the first PDF with its worker from the CDN.
// The `.catch` right on `import()` also lets esbuild bundle a host that didn't install it.
type PdfjsModule = typeof import('pdfjs-dist')
let pdfjsPromise: Promise<PdfjsModule> | null = null

const PDFJS_MISSING =
  '@justanarthur/modo-ui: PDF thumbnails need the optional peer dependency `pdfjs-dist` (npm install pdfjs-dist); showing the file icon instead.'

async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist')
      .catch(error => {
        console.warn(PDFJS_MISSING)
        throw error
      })
      .then(mod => {
        if (!mod.GlobalWorkerOptions.workerSrc) {
          mod.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`
        }
        return mod
      })
  }
  return pdfjsPromise
}

async function renderPdfFirstPage(file: File, targetWidth: number): Promise<string> {
  const pdfjs = await loadPdfjs()
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const page = await pdf.getPage(1)
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = (targetWidth * 2) / baseViewport.width
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvas, viewport }).promise
  return canvas.toDataURL('image/png')
}

interface FileThumbnailProps {
  file: File
  /** Side length of the square thumbnail in pixels. */
  size: number
  className?: string
}

/** A square preview of a File: images cover it, PDFs show their first page, anything else a document glyph. */
function FileThumbnail({ file, size, className }: FileThumbnailProps) {
  const shape = useShape()
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf'

  // Created and revoked in one effect: under StrictMode a memoized URL is
  // revoked by the simulated cleanup and never recreated.
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!isImage) {
      setImageUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [isImage, file])

  // Any failure (corrupt file, blocked worker, pdfjs-dist missing) shows the glyph.
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState(false)
  useEffect(() => {
    setPdfError(false)
    if (!isPdf) {
      setPdfUrl(null)
      return
    }
    let cancelled = false
    renderPdfFirstPage(file, size)
      .then(url => {
        if (!cancelled) setPdfUrl(url)
      })
      .catch(() => {
        if (!cancelled) setPdfError(true)
      })
    return () => {
      cancelled = true
    }
  }, [file, isPdf, size])

  const previewUrl = imageUrl ?? pdfUrl
  const isPending = (isImage && !imageUrl) || (isPdf && !pdfUrl && !pdfError)

  return (
    <div
      className={cn('relative shrink-0 overflow-hidden bg-accent border border-border', shape.bg, className)}
      style={{ width: size, height: size }}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={file.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : isPending ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-6 h-6 rounded-full border-2 border-border border-t-muted-foreground animate-spin"
            aria-label="Loading preview"
            role="status"
          />
        </div>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-muted-foreground"
          role="img"
          aria-label={file.name}
        >
          <svg
            width={Math.max(16, size * 0.35)}
            height={Math.max(16, size * 0.35)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
          </svg>
        </div>
      )}
    </div>
  )
}

export type { FileThumbnailProps }
export { FileThumbnail }
