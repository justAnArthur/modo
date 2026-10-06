import { shell } from 'virtual:modo-shell'
import { useEffect, useState } from 'react'
import { usePath } from '../router'

interface Heading {
  id: string
  label: string
  level: number
}

// A heading counts as current once its top passes this line.
const ACTIVE_OFFSET = 120

function label(heading: Element): string {
  return [...heading.childNodes]
    .filter(n => !(n instanceof Element && n.matches('[data-modo="anchor"]')))
    .map(n => n.textContent)
    .join('')
    .trim()
}

/** "On this page": the content's h2/h3 headings with ids, current one active. */
export function Toc() {
  const path = usePath()
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('[data-modo="content"] :is(h2, h3)[id]')]
    setHeadings(els.map(el => ({ id: el.id, label: label(el), level: el.tagName === 'H3' ? 3 : 2 })))

    let frame = 0
    const update = () => setActive(els.filter(el => el.getBoundingClientRect().top <= ACTIVE_OFFSET).at(-1)?.id ?? null)
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [path])

  if (headings.length < 2) return null

  const { Section, Item } = shell.Sidebar
  return (
    <div data-modo="toc">
      <Section title="On this page">
        {headings.map(h => (
          <Item key={h.id} href={`#${h.id}`} active={h.id === active}>
            <span data-modo="toc-label" data-level={h.level}>
              {h.label}
            </span>
          </Item>
        ))}
      </Section>
    </div>
  )
}
