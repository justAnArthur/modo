/*!
 * Local addition: one mock session for the AI app, as transcript
 * turns. The transcript's examples and the workspace pages render it.
 */

import Diff from '../../components/AI/diff'
import Code from '../../primitives/code'
import { CHANGES, TERMINAL_LINES } from './mock'
import Transcript, { type TaskItem, type TocChapter } from './transcript'

export const DEMO_CHAPTERS: TocChapter[] = [
  { id: 'chapter-read', title: 'Reading the design system', detail: '14:02 · 3 turns' },
  { id: 'chapter-build', title: 'Building the blocks', detail: '14:20 · 5 turns' },
  { id: 'chapter-verify', title: 'Verification', detail: '14:51 · now' },
]

export const DEMO_TASKS: TaskItem[] = [
  { content: 'Read the design rules and the craft page', status: 'completed' },
  { content: 'Add Meter and Diff components', status: 'completed' },
  { content: 'Build the AI app blocks', status: 'completed' },
  { content: 'Assemble the pages', status: 'in_progress' },
  { content: 'Lint, typecheck, check both themes', status: 'pending' },
  { content: 'Commit on the branch', status: 'pending' },
]

/** The opening turns: the ask, the reading, an Explore run. */
export function DemoReading() {
  return (
    <>
      <Transcript.Chapter id="chapter-read" title="Reading the design system" />
      <Transcript.User
        attachments={
          <>
            <Transcript.Attachment kind="image" name="claude-desktop.png" detail="1.2 MB" />
            <Transcript.Attachment kind="pasted" name="Pasted text" detail="38 lines" />
          </>
        }
      >
        Design a desktop app that drives all my claude profiles. Build it only from modo-ui and follow{' '}
        <Transcript.Mention path="ui/DESIGN.md" /> and <Transcript.Mention path="ui/AGENTS.md" />.
      </Transcript.User>
      <Transcript.Assistant>
        <Transcript.Work summary="Worked for 52s" detail="Thought 8s · 4 reads and searches · 1 agent">
          <Transcript.Thinking duration="8s">
            <p className="m-0">
              Pages render as example cards, so each screen is a page item with a framed example per state. Blocks carry
              the reusable parts.
            </p>
          </Transcript.Thinking>
          <Transcript.Tools>
            <Transcript.Tool index={0} value="read-design" tool="Read" summary="ui/DESIGN.md" meta="543 lines" />
            <Transcript.Tool index={1} value="read-agents" tool="Read" summary="ui/AGENTS.md" meta="81 lines" />
            <Transcript.Tool index={2} value="grep-goo" tool="Grep" summary={'"GooIndicator" ui/'} meta="12 files">
              <Code language="sh">
                {
                  'ui/lib/goo-indicator.tsx\nui/components/inputs/radio/index.tsx\nui/components/navigation/tabs/index.tsx\n…9 more'
                }
              </Code>
            </Transcript.Tool>
            <Transcript.Tool index={3} value="glob-blocks" tool="Glob" summary="ui/blocks/**/index.tsx" meta="1 file" />
          </Transcript.Tools>
          <Transcript.Agent agent="Explore" description="How the pages tier renders" meta="14 tool uses · 38s">
            <p className="m-0 text-body text-muted-foreground">
              Pages are discovered like blocks: a sidebar section, an overview card and an item page whose examples
              render at screen size.
            </p>
          </Transcript.Agent>
        </Transcript.Work>
        <p className="m-0">Here is the split I will build:</p>
        <ul className="m-0">
          <li>
            <strong>Blocks</strong> — profile switcher, sessions sidebar, transcript, prompts, composer and side pane.
          </li>
          <li>
            <strong>Pages</strong> — the workspace, a new session, the prompt states, profiles and settings.
          </li>
          <li>
            Two missing pieces become components: <code>Meter</code> and <code>Diff</code>.
          </li>
        </ul>
      </Transcript.Assistant>
    </>
  )
}

/** The building turns: writes, an edit with its diff, a background agent. */
export function DemoBuilding() {
  const icons = CHANGES[1]
  return (
    <>
      <Transcript.Chapter id="chapter-build" title="Building the blocks" />
      <Transcript.User>
        Go ahead. Keep the status hues for real states only, and show the custom-features slot.
      </Transcript.User>
      <Transcript.Assistant>
        <Transcript.Work summary="Worked for 2m 10s" detail="3 tool calls · 1 background agent" running>
          <Transcript.Tools defaultValue={['edit-icons']}>
            <Transcript.Tool
              index={0}
              value="write-meter"
              tool="Write"
              summary="ui/components/meter/index.tsx"
              meta="118 lines"
            />
            <Transcript.Tool index={1} value="edit-icons" tool="Edit" summary={icons?.path ?? ''} meta="+3 −1">
              <Diff lineNumbers={false} patch={icons?.patch ?? ''} />
            </Transcript.Tool>
            <Transcript.Tool index={2} value="lint" tool="Bash" summary="bun run lint" meta="exit 0">
              <Code language="sh">{TERMINAL_LINES.slice(0, 2).join('\n')}</Code>
            </Transcript.Tool>
          </Transcript.Tools>
          <Transcript.Agent
            agent="general-purpose"
            description="Audit every new file for custom values"
            status="running"
            background
            meta="6 tool uses"
          />
        </Transcript.Work>
        <p className="m-0">
          The blocks are in. The background audit keeps running while I assemble the pages; I will fold its findings in
          when it reports.
        </p>
      </Transcript.Assistant>
    </>
  )
}

/** The live turn: a check in flight. */
export function DemoVerifying() {
  return (
    <>
      <Transcript.Chapter id="chapter-verify" title="Verification" />
      <Transcript.Assistant streaming>
        <Transcript.Work summary="Working…" detail="bun run check" running>
          <Transcript.Tools>
            <Transcript.Tool index={0} value="check" tool="Bash" summary="bun run check" status="running" />
          </Transcript.Tools>
        </Transcript.Work>
      </Transcript.Assistant>
    </>
  )
}

/** The whole mock session. */
export function DemoSession() {
  return (
    <>
      <DemoReading />
      <DemoBuilding />
      <DemoVerifying />
    </>
  )
}
