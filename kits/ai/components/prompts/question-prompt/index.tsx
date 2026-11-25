/*!
 * Local addition (not part of Fluid Functionalism): an agent asks you to pick
 * — one answer or several, an optional preview per option beside the list,
 * and a free-text "Other".
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Checkbox from '@justanarthur/modo-ui/components/inputs/checkbox'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Code from '@justanarthur/modo-ui/primitives/content/code'
import { type KeyboardEvent, useState } from 'react'
import PromptCard from '../prompt-card'

interface QuestionOption {
  /** The answer, also what `onSubmit` reports. */
  label: string
  /** One line under the label. */
  description?: string
  /** Shown beside the list while this option is picked: a mockup, a snippet. */
  preview?: string
}

interface QuestionPromptProps {
  /** The question. */
  question: string
  /** Its topic, as a chip: `Layout`, `Auth`. */
  tag?: string
  /** Two to four options; labels are unique. */
  options: QuestionOption[]
  /** Pick several. Defaults to `false`. */
  multiSelect?: boolean
  /** Called with the picked labels and any "Other" text. */
  onSubmit?: (labels: string[], other: string) => void
  /** Takes focus on the options when it appears, unless you are typing elsewhere. */
  autoFocus?: boolean
}

function OptionContent({ option }: { option: QuestionOption }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-body text-foreground">{option.label}</span>
      {option.description && <span className="text-caption text-muted-foreground">{option.description}</span>}
    </span>
  )
}

/**
 * A question the agent asks with a few answers to pick from.
 *
 * One answer sits on a Choice list: the pick's background melts between
 * options and the arrow keys move it. With `multiSelect` the options are
 * checkboxes and neighbouring picks melt into one run. Options with a
 * `preview` show the picked one beside the list, dropping below it on a
 * narrow card. An "Other" field takes an answer of your own; typing one
 * dims the list, since it is your answer, and picking an option clears it.
 * Number keys pick (or tick) an option, Enter submits (⌘Enter where Enter
 * ticks a box), and Submit waits for a pick or an answer of your own.
 *
 * @example {@include ./examples.mdx}
 */
export default function QuestionPrompt({
  question,
  tag,
  options,
  multiSelect = false,
  onSubmit,
  autoFocus,
}: QuestionPromptProps) {
  const [picked, setPicked] = useState(options[0]?.label ?? '')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [other, setOther] = useState('')
  const own = other.trim() !== ''
  const ready = own || (multiSelect ? checked.size > 0 : picked !== '')
  const preview = options.find(o => o.label === picked)?.preview
  const hasPreviews = options.some(o => o.preview)

  const list = multiSelect ? (
    <Checkbox.Group checkedIndices={checked} onCheckedIndicesChange={setChecked} className="w-full">
      {options.map(option => (
        <Checkbox key={option.label} label={option.label} title={option.description} />
      ))}
    </Checkbox.Group>
  ) : (
    <ChoiceList
      label={question}
      value={picked}
      onValueChange={value => {
        setPicked(value)
        setOther('')
      }}
      options={options.map(option => ({
        value: option.label,
        label: option.label,
        content: <OptionContent option={option} />,
      }))}
    />
  )

  const submit = () => {
    if (ready) onSubmit?.(multiSelect ? options.filter((_, i) => checked.has(i)).map(o => o.label) : [picked], other)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const field = event.target instanceof HTMLInputElement
    const n = Number(event.key)
    if (!field && n >= 1 && n <= options.length && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      // Focus follows the pick, so Enter on the focused row submits that same option.
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"], [role="checkbox"]')[n - 1]?.focus()
      if (!multiSelect) {
        setPicked(options[n - 1]!.label)
        return setOther('')
      }
      const next = new Set(checked)
      if (!next.delete(n - 1)) next.add(n - 1)
      return setChecked(next)
    }
    // A box takes a bare Enter as its toggle: with several answers, Enter submits from the Other field.
    if (event.key !== 'Enter' || event.shiftKey || event.target instanceof HTMLButtonElement || (multiSelect && !field)) return
    event.preventDefault()
    submit()
  }

  // Ahead of the rows, so ⌘Enter on a box submits rather than toggles it first.
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return
    event.preventDefault()
    event.stopPropagation()
    submit()
  }

  return (
    <PromptCard
      icon="message-circle"
      title={question}
      tag={tag}
      hint={own ? 'Sends your own answer' : multiSelect ? 'Pick any · ⌘Enter submits' : `↑↓ or 1–${options.length} to pick · Enter submits`}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      actions={
        <Button size="compact" disabled={!ready} onClick={submit}>
          Submit
        </Button>
      }
    >
      <div className={cn('grid gap-3', hasPreviews && '@container')} onKeyDownCapture={onKeyDownCapture}>
        <div className={cn('grid gap-3', hasPreviews && '@lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]')}>
          <div
            data-autofocus
            className={cn('flex min-w-0 flex-col gap-1 transition-opacity duration-fast', multiSelect ? '-mx-3' : '-mx-2', own && !multiSelect && 'opacity-50')}
          >
            {list}
          </div>
          {hasPreviews && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Preview</span>
              <Code language="plaintext">{preview ?? 'No preview for this option.'}</Code>
            </div>
          )}
        </div>
        <Input placeholder="Other: type your own answer" value={other} onValueChange={setOther} />
      </div>
    </PromptCard>
  )
}

export type { QuestionOption, QuestionPromptProps }
export { QuestionPrompt }
