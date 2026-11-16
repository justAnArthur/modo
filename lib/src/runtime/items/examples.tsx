import { byName, exampleScope } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { Component, createContext, type MouseEvent, type ReactNode, useEffect, useState } from 'react'
import { EXAMPLE_PARAM, exampleKey } from '../../lib/paths'
import { slug } from '../../lib/text'
import type { ParsedExample } from '../../lib/tsdoc'
import { Heading } from '../anchor'
import { CopyButton } from '../code-block'
import { navigate } from '../location'
import { Markdown } from '../markdown'
import { babelReady, compileExampleBody, type ExampleRenderer, loadBabel } from './compile'

// Identifiers available to every example: the `examples` config module's
// exports, then the items by name (items win on collision). Module-level so
// compiled examples cache their bindings per this one object.
export const bindings: Record<string, unknown> = { ...exampleScope, ...byName }

/** An inline example, compiled: undefined until Babel has loaded, null when it doesn't compile. */
export function useExample(code: string): ExampleRenderer | null | undefined {
  const [ready, setReady] = useState(babelReady)
  useEffect(() => {
    if (!ready) loadBabel().then(() => setReady(true))
  }, [ready])
  return ready ? compileExampleBody(code) : undefined
}

/**
 * An example's title, or an examples.mdx group's (`group`): an anchored
 * heading with an `example-<slug>` id, h3 unless it sits in a group.
 */
export function ExampleTitle({
  label,
  level = 3,
  group = false,
  children,
}: {
  label: string
  level?: 3 | 4
  group?: boolean
  children?: ReactNode
}) {
  return (
    <Heading
      level={level}
      label={label}
      id={`example-${slug(label)}`}
      modo={group ? 'example-group-title' : 'example-card-title'}
    >
      {children}
    </Heading>
  )
}

/** Which of the item's .mdx files a ModoExample sits in, for its positional full-screen key. */
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
  const example = useExample(code)
  return (
    <div data-modo="example-card">
      {title ? <ExampleTitle label={title} /> : null}
      {description ? (
        <div data-modo="prose">
          <Markdown source={description} />
        </div>
      ) : null}
      <ExampleFrame code={code} fullScreen={exampleKey(title, index)}>
        {example ? example(bindings) : null}
      </ExampleFrame>
    </div>
  )
}

/**
 * Opens the example alone on the item's own route. The slot's Button is no
 * anchor: a modified or middle click opens a new tab when the host forwards the event.
 */
function openFullScreen(key: string, e?: MouseEvent) {
  const url = new URL(window.location.href)
  url.search = new URLSearchParams({ [EXAMPLE_PARAM]: key }).toString()
  url.hash = ''
  if (e && (e.button === 1 || e.metaKey || e.ctrlKey || e.shiftKey)) window.open(url, '_blank', 'noopener')
  else navigate(url, { modoFrom: window.location.href })
}

/**
 * The live stage, its hover-revealed Copy / Code / Full screen corner and the
 * code panel. `fullScreen` is the example's `?example=` key.
 */
export function ExampleFrame({
  code,
  fullScreen,
  children,
}: {
  code: string
  fullScreen: string
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
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open full screen"
          onClick={(e?: MouseEvent) => openFullScreen(fullScreen, e)}
          onAuxClick={(e: MouseEvent) => e.button === 1 && openFullScreen(fullScreen, e)}
        >
          <Icon name="maximize" label="Full screen" />
        </Button>
      </div>
      {open && (
        <div data-modo="example-code">
          <Code language="tsx">{code}</Code>
        </div>
      )}
    </div>
  )
}
