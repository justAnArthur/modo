/*!
 * Local addition (not part of Fluid Functionalism): an agent asks you to pick
 * — one answer or several, an optional preview per option beside the list,
 * and a free-text "Other".
 */

'use client'

import { useState } from 'react'
import { cn } from '../../../lib/utils'
import Code from '../../../primitives/code'
import Button from '../../button'
import Checkbox from '../../inputs/checkbox'
import ChoiceList from '../../inputs/choice-list'
import Input from '../../inputs/input'
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
 * narrow card. An "Other" field takes an answer of your own.
 *
 * @example {@include ./examples.mdx}
 */
export default function QuestionPrompt({ question, tag, options, multiSelect = false, onSubmit }: QuestionPromptProps) {
  const [picked, setPicked] = useState(options[0]?.label ?? '')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [other, setOther] = useState('')
  const preview = options.find(o => o.label === picked)?.preview
  const hasPreviews = options.some(o => o.preview)

  const list = multiSelect ? (
    <Checkbox.Group checkedIndices={checked} onCheckedIndicesChange={setChecked} className="w-full">
      {options.map(option => (
        <Checkbox key={option.label} label={option.label} />
      ))}
    </Checkbox.Group>
  ) : (
    <ChoiceList
      label={question}
      value={picked}
      onValueChange={setPicked}
      options={options.map(option => ({
        value: option.label,
        label: option.label,
        content: <OptionContent option={option} />,
      }))}
    />
  )

  const submit = () =>
    onSubmit?.(multiSelect ? options.filter((_, i) => checked.has(i)).map(o => o.label) : [picked], other)

  return (
    <PromptCard
      icon="message-circle"
      title={question}
      tag={tag}
      hint={multiSelect ? 'Pick any' : '↑↓ to move'}
      actions={
        <Button size="compact" onClick={submit}>
          Submit
        </Button>
      }
    >
      <div className={cn('grid gap-3', hasPreviews && '@container')}>
        <div className={cn('grid gap-3', hasPreviews && '@lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]')}>
          <div className={cn('flex min-w-0 flex-col gap-1', multiSelect ? '-mx-3' : '-mx-2')}>{list}</div>
          {hasPreviews && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Preview</span>
              <Code language="plaintext">{preview ?? 'No preview for this option.'}</Code>
            </div>
          )}
        </div>
        <Input placeholder="Other: type your own answer" value={other} onChange={setOther} />
      </div>
    </PromptCard>
  )
}

export type { QuestionOption, QuestionPromptProps }
export { QuestionPrompt }
