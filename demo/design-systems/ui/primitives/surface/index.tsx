import './surface.css'
import type { ReactNode } from 'react'
import { SurfaceProvider } from './surface-context'

/**
 * An elevated surface from the Fluid Functionalism 8-level ladder. Each level
 * pairs a ground color with a matching shadow recipe: light mode flattens to
 * white after level 2 and lets the shadow ladder carry the elevation, while
 * dark mode keeps stepping the ground lighter under a layered shadow recipe.
 *
 * Rendering a Surface also provides its level through context, so descendants
 * can read it with `useSurface()` and lift themselves relative to the surface
 * they sit in — a menu on the page and the same menu inside a dialog both land
 * on the right level without anything passed between them. The ladder tokens
 * are declared on `:root, .light, .dark`, so a subtree pinned with
 * `className="dark"` or `className="light"` re-resolves the whole ladder and
 * makes a reliable forced-theme preview at any nesting depth.
 *
 * @example
 * # The eight-level ladder
 *
 * Every level is a ground color paired 1:1 with a shadow recipe. Light
 * flattens to white after level 2 — the shadow ladder does the work — while
 * dark keeps adding white-opacity to the ground.
 *
 * ```tsx
 * <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--lg)' }}>
 *   <div className="dark" style={{ background: 'var(--background)', padding: 'var(--md)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>dark</span>
 *     <div style={{ display: 'flex', gap: 'var(--md)', flexWrap: 'wrap' }}>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={1}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>1</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={2}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>2</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={3}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>3</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={4}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>4</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={5}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>5</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={6}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>6</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={7}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>7</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={8}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>8</span>
 *       </div>
 *     </div>
 *   </div>
 *   <div className="light" style={{ background: 'var(--background)', padding: 'var(--md)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>light</span>
 *     <div style={{ display: 'flex', gap: 'var(--md)', flexWrap: 'wrap' }}>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={1}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>1</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={2}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>2</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={3}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>3</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={4}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>4</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={5}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>5</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={6}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>6</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={7}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>7</span>
 *       </div>
 *       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *         <Surface level={8}><div style={{ width: 56, height: 56 }} /></Surface>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>8</span>
 *       </div>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * @example
 * # One menu, three substrates
 *
 * Each container knows its own level, and whatever opens inside lifts relative
 * to it. The same three-item menu lands on surface 3, 5, and 7 depending only
 * on the substrate it sits on — components read that substrate with
 * `useSurface()` and add their own offset.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 'var(--md)', flexWrap: 'wrap' }}>
 *   <div style={{ flex: '1 1 180px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'var(--md)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>On the page · substrate 1</span>
 *     <Surface level={3}>
 *       <div style={{ padding: 'var(--sm)', display: 'flex', flexDirection: 'column' }}>
 *         <div style={{ padding: '6px var(--md)', borderRadius: 'var(--radius)', background: 'var(--active)', color: 'var(--foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Favorites</div>
 *         <div style={{ padding: '6px var(--md)', color: 'var(--muted-foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Recents</div>
 *         <div style={{ padding: '6px var(--md)', color: 'var(--muted-foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Private</div>
 *       </div>
 *     </Surface>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>menu lifts to surface 3 (1 + 2)</span>
 *   </div>
 *   <div style={{ flex: '1 1 180px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'var(--md)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>Inside a popover · substrate 3</span>
 *     <Surface level={5}>
 *       <div style={{ padding: 'var(--sm)', display: 'flex', flexDirection: 'column' }}>
 *         <div style={{ padding: '6px var(--md)', borderRadius: 'var(--radius)', background: 'var(--active)', color: 'var(--foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Favorites</div>
 *         <div style={{ padding: '6px var(--md)', color: 'var(--muted-foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Recents</div>
 *         <div style={{ padding: '6px var(--md)', color: 'var(--muted-foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Private</div>
 *       </div>
 *     </Surface>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>menu lifts to surface 5 (3 + 2)</span>
 *   </div>
 *   <div style={{ flex: '1 1 180px', background: 'var(--surface-5)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'var(--md)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>Inside a dialog · substrate 5</span>
 *     <Surface level={7}>
 *       <div style={{ padding: 'var(--sm)', display: 'flex', flexDirection: 'column' }}>
 *         <div style={{ padding: '6px var(--md)', borderRadius: 'var(--radius)', background: 'var(--active)', color: 'var(--foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Favorites</div>
 *         <div style={{ padding: '6px var(--md)', color: 'var(--muted-foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Recents</div>
 *         <div style={{ padding: '6px var(--md)', color: 'var(--muted-foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Private</div>
 *       </div>
 *     </Surface>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>menu lifts to surface 7 (5 + 2)</span>
 *   </div>
 * </div>
 * ```
 *
 * @example
 * # Nesting surfaces
 *
 * A Surface is itself a substrate: each nested layer picks its offset off the
 * one it sits in, so page, card, popover, and menu stack up the ladder one
 * step at a time — and in dark mode you can watch the grounds lighten while
 * light mode deepens the shadows instead.
 *
 * ```tsx
 * <Surface level={1}>
 *   <div style={{ padding: 'var(--lg)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>Page · surface 1</span>
 *     <Surface level={3}>
 *       <div style={{ padding: 'var(--lg)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *         <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>Card · surface 3 (+2)</span>
 *         <Surface level={5}>
 *           <div style={{ padding: 'var(--lg)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *             <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>Popover · surface 5 (+2)</span>
 *             <Surface level={7}>
 *               <div style={{ padding: 'var(--lg)' }}>
 *                 <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>Menu · surface 7 (+2)</span>
 *               </div>
 *             </Surface>
 *           </div>
 *         </Surface>
 *       </div>
 *     </Surface>
 *   </div>
 * </Surface>
 * ```
 *
 * @example
 * # Forced-theme scopes
 *
 * The ladder is declared on the root plus the light and dark classes, and the
 * shadow aliases are re-pointed per scheme, so pinning any subtree with a
 * class re-resolves everything inside it — a dark preview nests happily in
 * the light page, and a light card nests inside that dark preview.
 *
 * ```tsx
 * <div className="dark" style={{ background: 'var(--background)', padding: 'var(--md)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *   <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>dark scope · the ladder re-resolves inside it</span>
 *   <div style={{ display: 'flex', gap: 'var(--md)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
 *     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *       <Surface level={3}><div style={{ width: 56, height: 56 }} /></Surface>
 *       <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>3</span>
 *     </div>
 *     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *       <Surface level={6}><div style={{ width: 56, height: 56 }} /></Surface>
 *       <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>6</span>
 *     </div>
 *     <div className="light" style={{ background: 'var(--background)', padding: 'var(--md)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 'var(--md)' }}>
 *       <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>light nested inside dark</span>
 *       <div style={{ display: 'flex', gap: 'var(--md)' }}>
 *         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *           <Surface level={3}><div style={{ width: 56, height: 56 }} /></Surface>
 *           <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>3</span>
 *         </div>
 *         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sm)' }}>
 *           <Surface level={6}><div style={{ width: 56, height: 56 }} /></Surface>
 *           <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>6</span>
 *         </div>
 *       </div>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * @example
 * # Why the lift is relative
 *
 * A menu with a fixed ground ends up the same color as the dialog it opens
 * from — a borrowed shadow cannot save it. Lifted by its substrate it gets
 * its own ground and its own shadow, and it reads as a popover at any depth.
 *
 * ```tsx
 * <div className="dark" style={{ background: 'var(--background)', padding: 'var(--md)', borderRadius: 'var(--radius)', display: 'flex', gap: 'var(--md)', flexWrap: 'wrap' }}>
 *   <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 'var(--sm)' }}>
 *     <Surface level={5}>
 *       <div style={{ padding: 'var(--md)', display: 'flex', flexDirection: 'column', gap: 'var(--sm)' }}>
 *         <span style={{ color: 'var(--foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Dialog at surface 5</span>
 *         <div style={{ background: 'var(--surface-5)', boxShadow: 'var(--shadow-3)', borderRadius: 'var(--radius)', padding: 'var(--sm)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
 *           <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Hard-coded ground: surface 5 on surface 5</span>
 *           <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--fs-caption, 12px)' }}>The menu melts straight into the dialog.</span>
 *         </div>
 *       </div>
 *     </Surface>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>fixed ground, borrowed shadow · melts</span>
 *   </div>
 *   <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 'var(--sm)' }}>
 *     <Surface level={5}>
 *       <div style={{ padding: 'var(--md)', display: 'flex', flexDirection: 'column', gap: 'var(--sm)' }}>
 *         <span style={{ color: 'var(--foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Dialog at surface 5</span>
 *         <Surface level={7}>
 *           <div style={{ padding: 'var(--sm)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
 *             <span style={{ color: 'var(--foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Lifted: substrate 5 + 2 = surface 7</span>
 *             <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--fs-caption, 12px)' }}>Its own ground and shadow — it reads.</span>
 *           </div>
 *         </Surface>
 *       </div>
 *     </Surface>
 *     <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 'var(--fs-caption, 12px)', color: 'var(--muted-foreground)' }}>relative lift to surface 7 · reads</span>
 *   </div>
 * </div>
 * ```
 */
export default function Surface(
  {
    level = 3,
    className,
    children,
  }: {
    /** Surface level, clamped to 1–8. Each level pairs its surface color with the matching shadow recipe. */
    level?: number
    /** Extra class for the surface box. */
    className?: string
    children: ReactNode
  }) {
  const clamped = Math.max(1, Math.min(8, level))
  return (
    <SurfaceProvider value={clamped}>
      <div data-surface={clamped} className={className}>
        {children}
      </div>
    </SurfaceProvider>
  )
}

export { useSurface, SurfaceProvider, SurfaceContext } from './surface-context'
