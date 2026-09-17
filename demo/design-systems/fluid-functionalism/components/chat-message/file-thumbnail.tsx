/*
 * Vendored from the Fluid Functionalism registry (@fluid namespace,
 * fluidfunctionalism.com — MIT License © 2026 Micka Touillaud), pulled with
 * `bunx shadcn@latest add @fluid/chat-message` (shadcn CLI 4.21.0) into a scratch
 * scaffold. Local modifications: `@/…` imports rewritten to relative paths for the modo layout; `framer-motion` imports rewritten to `motion/react`; `"use client"` directives dropped (non-RSC). Type-skew fixes for this workspace's pinned deps: pdfjs-dist is not a workspace dep — its import is kept lazy via a variable specifier and typed structurally (image thumbnails never load it).
 */

import { useEffect, useState } from "react";
import { cn } from "../../_fluid/utils";
import { useShape } from "../../_fluid/shape-context";

// ─── Lazy pdfjs loader ────────────────────────────────────────────────────
// Imports pdfjs-dist on first PDF, caches the module, and points the worker
// at the matching CDN build. Consumers don't need bundler-side worker config.
// pdfjs-dist is NOT a dependency of this workspace: the import specifier is
// kept in a variable so bundlers leave it as a runtime import (it resolves
// only in host apps that installed pdfjs-dist; image thumbnails never hit
// it), and the pdfjs surface is declared structurally below instead of via
// `typeof import("pdfjs-dist")`.
interface PdfjsViewport {
  width: number;
  height: number;
}
interface PdfjsPage {
  getViewport(options: { scale: number }): PdfjsViewport;
  render(options: { canvas: HTMLCanvasElement; viewport: PdfjsViewport }): {
    promise: Promise<unknown>;
  };
}
interface PdfjsDocument {
  getPage(pageNumber: number): Promise<PdfjsPage>;
}
interface PdfjsModule {
  version: string;
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(options: { data: ArrayBuffer }): { promise: Promise<PdfjsDocument> };
}
const pdfjsSpecifier = "pdfjs-dist";
let pdfjsPromise: Promise<PdfjsModule> | null = null;

async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ pdfjsSpecifier).then((mod) => {
      const pdfjs = mod as unknown as PdfjsModule;
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function renderPdfFirstPage(file: File, targetWidth: number): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = (targetWidth * 2) / baseViewport.width; // 2× for retina
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL("image/png");
}

// ─── File thumbnail ───────────────────────────────────────────────────────
// Read-only square preview of a File. Images use object-cover via
// `URL.createObjectURL`; PDFs render the first page via pdfjs; while either is
// resolving a spinner is shown. Self-contained (border + surface + sizing) so
// it can be reused both inside the composer's preview row and to render
// already-sent attachments in a chat transcript.
interface FileThumbnailProps {
  file: File;
  /** Side length of the square thumbnail in pixels. */
  size: number;
  className?: string;
}

function FileThumbnail({ file, size, className }: FileThumbnailProps) {
  const shape = useShape();
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  // Create blob URL inside an effect (NOT useMemo) so the cleanup-revoke
  // and the URL-creation stay in sync. In React 18 StrictMode dev, a
  // useMemo-created URL gets revoked by the simulated effect-cleanup but
  // useMemo doesn't re-run on the simulated re-mount (no re-render happens),
  // leaving the DOM with a stale, revoked `blob:` URL — broken image.
  // Putting both in the same effect means the simulated re-mount creates a
  // fresh URL and updates state. The one-frame "before URL" state is
  // covered by the bg-accent (no fallback icon shown for images), so the
  // transition is visually clean.
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isImage) {
      // Clear stale state if the `file` prop swaps type on the same mount —
      // otherwise a revoked blob URL would keep winning over the new preview.
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [isImage, file]);

  // PDFs need async rendering — loading flash is unavoidable for the first
  // ~100–300ms while pdfjs loads. Falls back to the generic icon on error
  // (corrupt/password-protected file, CDN worker blocked).
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  useEffect(() => {
    setPdfError(false);
    if (!isPdf) {
      setPdfUrl(null);
      return;
    }
    let cancelled = false;
    renderPdfFirstPage(file, size)
      .then((url) => {
        if (!cancelled) setPdfUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPdfError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file, isPdf, size]);

  const previewUrl = imageUrl ?? pdfUrl;
  // Spinner only while a preview is genuinely pending; anything that can't
  // produce one (failed PDF, unsupported type) gets the generic icon instead.
  const isPending = (isImage && !imageUrl) || (isPdf && !pdfUrl && !pdfError);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-accent border border-border",
        shape.bg,
        className
      )}
      style={{ width: size, height: size }}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={file.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : isPending ? (
        // Circular spinner while we wait for the preview to be ready.
        // Used for both images (brief URL-creation gap) and PDFs (longer
        // pdfjs render). The thin ring is mostly subtle (border-border)
        // with one quadrant accented (border-t-muted-foreground) so the
        // `animate-spin` rotation reads as a moving arc.
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-6 h-6 rounded-full border-2 border-border border-t-muted-foreground animate-spin"
            aria-label="Loading preview"
            role="status"
          />
        </div>
      ) : (
        // Generic document glyph for files with no renderable preview.
        // Inline SVG (not the icon system) so the thumbnail stays
        // self-contained for registry consumers.
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
  );
}

export { FileThumbnail, loadPdfjs, renderPdfFirstPage };
export type { FileThumbnailProps };
