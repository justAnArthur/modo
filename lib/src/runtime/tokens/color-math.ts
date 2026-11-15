export interface PageColors {
  fg: string
  bg: string
}

/** The host's page text and canvas colors, as the docs content inherits them. */
export function pageColors(): PageColors {
  const at = document.querySelector('[data-modo="content"]') ?? document.body
  // The root paints the system canvas when nothing sets a background.
  let bg = 'Canvas'
  for (let el: Element | null = at; el; el = el.parentElement) {
    const c = getComputedStyle(el).backgroundColor
    if (paint(c)[3] > 0) {
      bg = c
      break
    }
  }
  return { fg: getComputedStyle(at).color, bg }
}

export type Rgba = [number, number, number, number]

const pen = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
const probe = document.createElement('i')
probe.hidden = true

/** `color` as the page computes it. The canvas can't parse light-dark() or
    system colors and silently keeps its previous fill; computed styles resolve
    them against the page's color-scheme. */
function computed(color: string): string {
  if (!probe.isConnected) document.body.append(probe)
  probe.style.color = ''
  probe.style.color = color
  return getComputedStyle(probe).color
}

/** Paint `color` (over `under`) and read the pixel back — resolves any CSS
    color syntax the browser knows (oklch, color-mix, …) to sRGB. */
export function paint(color: string, under?: string): Rgba {
  pen.clearRect(0, 0, 1, 1)
  if (under) {
    pen.fillStyle = computed(under)
    pen.fillRect(0, 0, 1, 1)
  }
  pen.fillStyle = computed(color)
  pen.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data
  return [r!, g!, b!, a!]
}

export function toHex([r, g, b]: Rgba): string {
  return `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`
}

export function contrast(a: Rgba, b: Rgba): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
