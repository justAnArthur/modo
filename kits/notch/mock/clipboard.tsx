/*
 * Mock: an afternoon of copying for the clipboard widget, one clip of each
 * kind, read at a pinned moment so the times hold. Nothing here ships in the
 * barrel.
 */

import type { ClipboardClip } from '../blocks/system/clipboard'
import { MockArtwork } from './artwork'

const MINUTE = 60_000

/** The moment the history is read at. */
export const CLIP_NOW = new Date(2026, 10, 17, 15, 42).getTime()

const ago = (minutes: number) => CLIP_NOW - minutes * MINUTE

export const CLIPS: ClipboardClip[] = [
  {
    id: 'quote',
    kind: 'text',
    content:
      'The island grows out of the notch and melts back into it; nothing on screen should feel like it came from nowhere.',
    app: 'Notes',
    copiedAt: ago(2),
  },
  {
    id: 'docs',
    kind: 'link',
    content: 'https://justanarthur.github.io/modo/notch/docs/blocks/agenda',
    detail: 'Agenda · modo ui notch',
    preview: <MockArtwork variant="night" />,
    app: 'Safari',
    copiedAt: ago(9),
  },
  {
    id: 'shot',
    kind: 'image',
    content: 'Screenshot 2026-11-17 at 15.21',
    detail: '1440 × 900 · PNG',
    preview: <MockArtwork variant="dusk" />,
    app: 'Screenshot',
    copiedAt: ago(21),
  },
  {
    id: 'brand',
    kind: 'color',
    // A theme token, so the swatch follows the scheme and no literal color sits in the docs.
    content: 'var(--badge-blue)',
    detail: 'modo-ui badge blue',
    app: 'Zed',
    copiedAt: ago(48),
  },
  {
    id: 'brief',
    kind: 'file',
    content: 'Island brief.pdf',
    detail: '2.4 MB',
    app: 'Finder',
    copiedAt: ago(95),
  },
  {
    id: 'cmd',
    kind: 'text',
    content: 'bun run build && bun run check',
    app: 'Terminal',
    copiedAt: ago(130),
  },
  {
    id: 'address',
    kind: 'text',
    content: 'Main St 12, 2nd floor',
    app: 'Messages',
    copiedAt: ago(26 * 60),
  },
]

/** Kept on top: the build command and the color. */
export const PINNED = ['cmd', 'brand']
