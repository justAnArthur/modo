/*!
 * Local addition: the side pane's Artifacts — what Claude made in this
 * session, newest first, one fluid hover along the rows.
 */

'use client'

import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import FluidHover from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import { type IconName, useIcon } from '../../../lib/icons'
import { PaneEmpty, PaneSection } from '../../../lib/pane-parts'
import type { ArtifactKind, PaneArtifact } from '../../../lib/side-pane-types'

const ARTIFACT_ICON: Record<ArtifactKind, IconName> = {
  page: 'globe',
  dashboard: 'layout-dashboard',
  document: 'file-text',
  diagram: 'list-tree',
}

const ARTIFACT_KIND: Record<ArtifactKind, string> = {
  page: 'Page',
  dashboard: 'Dashboard',
  document: 'Document',
  diagram: 'Diagram',
}

function ArtifactRow({ artifact, index, onOpen }: { artifact: PaneArtifact; index: number; onOpen?: () => void }) {
  const size = useSize()
  const Icon = useIcon(ARTIFACT_ICON[artifact.kind])
  return (
    <FluidHover.Item index={index} onClick={onOpen} className={cn('gap-2 px-2', size.control, size.text)}>
      <Icon size={size.icon} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{artifact.title}</span>
      <span className="shrink-0 text-caption text-muted-foreground">
        {ARTIFACT_KIND[artifact.kind]} · {artifact.updated}
      </span>
    </FluidHover.Item>
  )
}

interface ArtifactsPaneProps {
  /** What Claude made in this session, newest first. */
  artifacts: PaneArtifact[]
  /** Called with the artifact a press opens. */
  onOpen?: (artifact: PaneArtifact) => void
}

/**
 * The pages, documents, dashboards and diagrams Claude made in this
 * session, newest first.
 *
 * Each row shows the artifact's kind as its glyph and in words, and when it
 * last changed; one fluid hover runs along the rows and a press opens one.
 * With none yet, the pane says what lands there.
 *
 * @example {@include ./examples.mdx}
 */
export default function ArtifactsPane({ artifacts, onOpen }: ArtifactsPaneProps) {
  if (artifacts.length === 0)
    return (
      <PaneEmpty
        icon="layers"
        title="No artifacts yet"
        detail="Pages, documents and dashboards Claude makes land here."
      />
    )
  return (
    <PaneSection title="Artifacts" meta={`${artifacts.length} · private until you share them`}>
      <FluidHover className="gap-0">
        {artifacts.map((artifact, i) => (
          <ArtifactRow key={`${i}:${artifact.title}`} artifact={artifact} index={i} onOpen={() => onOpen?.(artifact)} />
        ))}
      </FluidHover>
    </PaneSection>
  )
}

export type { ArtifactsPaneProps }

export { ArtifactsPane }
