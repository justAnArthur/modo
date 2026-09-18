/*
 * Fluid Functionalism chat conversation — a modo block composing three @fluid
 * registry pieces: ChatMessage (transcript entries), ThinkingIndicator (the
 * assistant's working state) and InputMessage (the composer). Authored for
 * this showcase (the registry ships the parts, not this composition) —
 * fluidfunctionalism.com, MIT License © 2026 Micka Touillaud.
 */

import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from '../../components/chat-message'
import { ThinkingIndicator } from '../../components/thinking-indicator'
import { InputMessage } from './input-message'

interface Entry {
  id: number
  from: 'user' | 'assistant'
  text: string
}

const initialMessages: Entry[] = [
  { id: 1, from: 'user', text: 'Summarize the motion system in one breath.' },
  {
    id: 2,
    from: 'assistant',
    text: 'Springs, not durations: fast 80ms for popups, moderate 160ms critically damped for panels, slow 240ms with a touch of bounce when overshoot reads as intent.',
  },
]

/**
 * A chat conversation — Fluid Functionalism's signature composition. Springs
 * animate each message in, the thinking indicator shimmers while the reply is
 * "generated", and the composer is the @fluid InputMessage on its elevated
 * substrate. Send a message to watch the flow.
 *
 * @example # Conversation
 * ```tsx
 * <Chat />
 * ```
 *
 * @example # Thinking
 * Pin the assistant's working state after the last reply.
 *
 * ```tsx
 * <Chat pending />
 * ```
 *
 * @example # Compact transcript
 * The size ladder applies to bubbles, indicator and composer alike.
 *
 * ```tsx
 * <Chat size="compact" />
 * ```
 */
export default function Chat({ pending = false, size = 'default', placeholder = 'Message Fluid…' }: {
  /** Show the thinking indicator under the last reply (also appears live while a sent message is pending). */
  pending?: boolean
  /** Size ladder step applied to the transcript, indicator and composer. @values default, compact */
  size?: 'default' | 'compact'
  /** Placeholder shown in the composer. @default 'Message Fluid…' */
  placeholder?: string
}) {
  const [entries, setEntries] = useState<Entry[]>(initialMessages)
  const [value, setValue] = useState('')
  const [thinking, setThinking] = useState(false)
  const nextId = useRef(initialMessages.length + 1)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const handleSend = (sent: string) => {
    setEntries((prev) => [...prev, { id: nextId.current++, from: 'user', text: sent }])
    setValue('')
    setThinking(true)
    timer.current = setTimeout(() => {
      setEntries((prev) => [
        ...prev,
        {
          id: nextId.current++,
          from: 'assistant',
          text: 'Copied. The reply you are reading is canned — wiring a model is the host app\u2019s job.',
        },
      ])
      setThinking(false)
    }, 1200)
  }

  const isThinking = pending || thinking

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 400, maxWidth: '100%' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entries.map((entry) => (
          <ChatMessage
            key={entry.id}
            from={entry.from}
            size={size}
            time={entry.from === 'user' ? 'Wednesday 6:08 PM' : undefined}
          >
            {entry.text}
          </ChatMessage>
        ))}
        {isThinking ? <ThinkingIndicator size={size} /> : null}
      </div>
      <InputMessage
        size={size}
        value={value}
        onValueChange={setValue}
        onSend={handleSend}
        placeholder={placeholder}
      />
    </div>
  )
}
