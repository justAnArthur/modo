/*
 * modo shell adapter — not a documented item.
 *
 * modo's chrome asks for icons by name (lib/src/lib/slots.tsx Icon slot);
 * this maps them onto the lucide set the design system already uses.
 */

import { Check, CodeXml, Copy, Link2 } from 'lucide-react'

const icons = { code: CodeXml, copy: Copy, check: Check, link: Link2 }

export default function Icon({ name }: {
  /** Which chrome icon to draw. */
  name: keyof typeof icons
  /** Accessible text; the button around the icon carries it. */
  label: string
}) {
  const Glyph = icons[name]
  return <Glyph size={16} strokeWidth={1.5} aria-hidden />
}
