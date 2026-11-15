import { byName, exampleScope } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { Component, createContext, type MouseEvent, type ReactNode, useEffect, useState } from 'react'
import { babelReady, compileExampleBody, isCompiledExample, loadBabel } from '../../lib/example'
import type { ParsedExample } from '../../lib/tsdoc'
import { Heading, slug } from '../anchor'
import { CopyButton } from '../code-block'
import { Markdown } from '../markdown'
import { navigate } from '../router'

// Identifiers available to every example: the `examples` config module's
// exports, then the items by name (items win on collision). Module-level so
// compiled examples cache their bindings per this one object.
export const bindings: Record<string, unknown> = { ...exampleScope, ...byName }

/** Re-renders once Babel has loaded; until then an inline example's stage stays empty. */
export function useBabel(): boolean {
  const [ready, setReady] = useState(babelReady)
  useEffect(() => {
    if (!ready) loadBabel().then(() => setReady(true))
  }, [ready])
  return ready
}

/**
 * An example's `?example=` key: its title's slug, else its position — `3` for
 * the third `@example`, `2.1` for the first live block of the second .mdx.
 */
export function exampleKey(title: string | undefined, index: number, doc?: number): string {
  if (title) return slug(title)
  return doc === undefined ? String(index + 1) : `${doc + 1}.${index + 1}`
}

/** Which of the item's .mdx files a ModoExample sits in. */
export const ExampleDocContext = createContext(0)

/** `@example` cards, then the item's included .mdx examples (`children`). */
export function ItemExamples({ examples, children }: { examples: ParsedExample[]; children?: ReactNode }) {
  return (
    <section data-modo="section">
      <Heading level={2} label="Examples" modo="section-title" />
      {examples.map((ex, i) => (
        <ExampleCard key={i} example={ex} index={i} />
      ))}
      {children}
    </section>
  )
}

/** Keeps one broken example from taking down the page; the error is logged. */
export class ExampleBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[modo] example failed to render:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function ExampleCard({ example: { title, description, code }, index }: { example: ParsedExample; index: number }) {
  const compiled = useBabel() ? compileExampleBody(code) : null
  return (
    <div data-modo="example-card">
      {title ? <Heading level={3} label={title} id={`example-${slug(title)}`} modo="example-card-title" /> : null}
      {description ? (
        <div data-modo="prose">
          <Markdown source={description} />
        </div>
      ) : null}
      <ExampleFrame code={code} fullScreen={exampleKey(title, index)}>
        {isCompiledExample(compiled) ? compiled(bindings) : null}
      </ExampleFrame>
    </div>
  )
}

/**
 * Opens the example alone, on the item's own route: a modified click (or a
 * middle click) opens a new tab, since the slot's Button is no anchor.
 */
function openFullScreen(key: string, e: MouseEvent) {
  const url = new URL(window.location.href)
  url.search = new URLSearchParams({ example: key }).toString()
  url.hash = ''
  if (e.button === 1 || e.metaKey || e.ctrlKey || e.shiftKey) window.open(url, '_blank', 'noopener')
  else navigate(url, { modoFrom: window.location.href })
}

/**
 * The live stage, its hover-revealed Copy / Code / Full screen corner and the
 * code panel. `fullScreen` is the example's `?example=` key; without it there's
 * no full-screen action.
 */
export function ExampleFrame({
  code,
  fullScreen,
  children,
}: {
  code: string
  fullScreen?: string
  children: ReactNode
}) {
  const { Code, Button, Icon } = shell
  const [open, setOpen] = useState(false)
  return (
    <div data-modo="example-card-frame">
      <div data-modo="example-card-stage">
        <ExampleBoundary key={code}>{children}</ExampleBoundary>
      </div>
      <div data-modo="example-actions">
        <CopyButton text={code} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Show code"
          aria-pressed={open}
          onClick={() => setOpen(o => !o)}
        >
          <Icon name="code" label="Code" />
        </Button>
        {fullScreen === undefined ? null : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open full screen"
            onClick={(e: MouseEvent) => openFullScreen(fullScreen, e)}
            onAuxClick={(e: MouseEvent) => e.button === 1 && openFullScreen(fullScreen, e)}
          >
            <Icon name="maximize" label="Full screen" />
          </Button>
        )}
      </div>
      {open && (
        <div data-modo="example-code">
          <Code language="tsx">{code}</Code>
        </div>
      )}
    </div>
  )
}
