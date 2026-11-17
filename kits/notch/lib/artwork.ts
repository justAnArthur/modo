/*
 * Artwork that never blinks: the last good picture stays up while the next
 * one loads, or while an update arrives without one for the same track, and
 * only a track that truly has none falls back to the placeholder. Plus the
 * tint a picture lends the widget around it.
 */

'use client'

import { type ReactNode, useEffect, useState } from 'react'

/** A track's picture: an image URL or any element; `null` when the track has none, `undefined` while it isn't known yet. */
export type Artwork = string | ReactNode

/** What the artwork tile shows: a picture, or the placeholder (`art: null`), under an `id` that changes only when the picture does. */
export interface ShownArtwork {
  id: string
  art: Artwork | null
}

const NONE = 'none'

/**
 * The artwork to show for the track `trackKey` names, held across updates.
 *
 * A URL is decoded before it replaces what's shown, so the swap is never to
 * a blank. An update without artwork (`undefined`, or `null` for the same
 * track) keeps the last good picture. A new track with `null`, or a URL that
 * fails to load for a new track, shows the placeholder.
 */
export function useStableArtwork(artwork: Artwork | null | undefined, trackKey: string): ShownArtwork {
  const id = typeof artwork === 'string' ? artwork : `node:${trackKey}`
  const [shown, setShown] = useState<ShownArtwork & { track: string }>(() =>
    artwork == null ? { id: NONE, art: null, track: trackKey } : { id, art: artwork, track: trackKey },
  )

  useEffect(() => {
    if (artwork === undefined) return
    if (artwork === null) {
      setShown(prev => (prev.track === trackKey ? prev : { id: NONE, art: null, track: trackKey }))
      return
    }
    if (typeof artwork !== 'string') {
      setShown(prev => (prev.id === id ? prev : { id, art: artwork, track: trackKey }))
      return
    }
    let live = true
    const image = new Image()
    image.src = artwork
    image.decode().then(
      () => live && setShown(prev => (prev.id === id ? prev : { id, art: artwork, track: trackKey })),
      () => live && setShown(prev => (prev.track === trackKey ? prev : { id: NONE, art: null, track: trackKey })),
    )
    return () => {
      live = false
    }
    // `artwork` is read through `id`: an element is a new object on every render.
  }, [id, trackKey, artwork === null, artwork === undefined])

  // The same picture as an element: render the current one, so its props stay fresh.
  if (shown.id === id && artwork != null && typeof artwork !== 'string') return { id, art: artwork }
  return shown
}

const SAMPLE = 12

/**
 * The color an image URL leans to, as `rgb(…)`: its pixels averaged, the
 * vivid ones weighted up, so a mostly grey cover still lends its accent.
 * Read once per URL; `undefined` until then, or when the image can't be
 * read (a cross-origin image without CORS).
 */
export function useArtworkTint(src?: string) {
  const [tint, setTint] = useState<{ src: string; color?: string }>()

  useEffect(() => {
    if (!src) return
    let live = true
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = src
    image
      .decode()
      .then(() => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = SAMPLE
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) return
        context.drawImage(image, 0, 0, SAMPLE, SAMPLE)
        const { data } = context.getImageData(0, 0, SAMPLE, SAMPLE)
        let r = 0
        let g = 0
        let b = 0
        let total = 0
        for (let i = 0; i < data.length; i += 4) {
          const [pr = 0, pg = 0, pb = 0] = [data[i], data[i + 1], data[i + 2]]
          const weight = 0.1 + (Math.max(pr, pg, pb) - Math.min(pr, pg, pb)) / 255
          r += pr * weight
          g += pg * weight
          b += pb * weight
          total += weight
        }
        if (live) setTint({ src, color: `rgb(${r / total} ${g / total} ${b / total})` })
      })
      .catch(() => live && setTint({ src }))
    return () => {
      live = false
    }
  }, [src])

  return tint && tint.src === src ? tint.color : undefined
}
