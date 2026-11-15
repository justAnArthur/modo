/*!
 * Local addition: the agent desktop's main window while the agent waits on
 * the user — one state per prompt kind, on the Workspace page.
 */

import Workspace, { type PromptKind } from '../workspace'

interface InteractionPromptsProps {
  /** The prompt waiting under the transcript. Defaults to `'permission'`. */
  prompt?: Exclude<PromptKind, 'none'>
}

/**
 * The main window while the agent waits on you: a permission, a question,
 * a plan to approve, or a choice about where work should run.
 *
 * The prompt lifts under the transcript and the task list folds to one row
 * to make room. Answering puts the session back to work: the prompt goes
 * and the composer streams again.
 * The prompts themselves are the agent prompt block's; this page shows each
 * one in place.
 *
 * @example {@include ./examples.mdx}
 */
export default function InteractionPrompts({ prompt = 'permission' }: InteractionPromptsProps) {
  return <Workspace prompt={prompt} pane="none" />
}

export type { InteractionPromptsProps }
