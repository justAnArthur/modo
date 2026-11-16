/*!
 * Local addition: a mock reply that streams in a few words at a time, so the
 * workspace answers what you send and the transcript has something to follow.
 */

'use client'

import { useEffect, useState } from 'react'
import Transcript from '../blocks/conversation/transcript'

const REPLY = `On it. I'll read the blocks that touch this first, then change them one at a time and run the checks after each.

1. Find where the composer hands the draft to the session.
2. Make the change and keep the props as they are.
3. Run \`bun run check\` and look at both themes.

I'll stop and ask before anything that leaves this branch.`

const WORDS = REPLY.split(/(?<=\s)/)

/** The canned answer to a message, a few words per tick until it is whole. */
export function DemoReply() {
  const [count, setCount] = useState(0)
  const done = count >= WORDS.length

  useEffect(() => {
    if (done) return
    const id = setTimeout(() => setCount(count + 3), 60)
    return () => clearTimeout(id)
  }, [count, done])

  return <Transcript.Assistant streaming={!done}>{WORDS.slice(0, count).join('')}</Transcript.Assistant>
}
