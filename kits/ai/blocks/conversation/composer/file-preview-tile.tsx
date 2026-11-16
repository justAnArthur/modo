/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see ui/PORTING.md.
 */

'use client'

import { Tooltip } from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useIcon } from '@justanarthur/modo-ui/lib/icon-context'
import { spring } from '@justanarthur/modo-ui/lib/springs'
import { motion } from 'motion/react'
import { forwardRef } from 'react'
import { FileThumbnail } from './file-thumbnail'

interface FilePreviewTileProps {
  file: File
  onRemove: () => void
  size: number
}

// A forwardRef: `<AnimatePresence mode="popLayout">` measures the exiting tile
// through a ref, which React 18 drops on a plain function component.
const FilePreviewTile = forwardRef<HTMLDivElement, FilePreviewTileProps>(function FilePreviewTile(
  { file, onRemove, size },
  ref,
) {
  const XIcon = useIcon('x')

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: spring.fast.exit }}
      transition={spring.fast}
      className="relative shrink-0 cursor-default group/tile"
    >
      <FileThumbnail file={file} size={size} />
      <Tooltip content="Remove" side="top">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove ${file.name}`}
          // Pinned to the light scheme so the badge keeps one contrast over any image.
          className="light absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground text-background opacity-0 group-hover/tile:opacity-100 transition-opacity duration-fast flex items-center justify-center cursor-pointer outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-focus-ring"
        >
          <XIcon size={12} strokeWidth={2.5} />
        </button>
      </Tooltip>
    </motion.div>
  )
})

export { FilePreviewTile }
