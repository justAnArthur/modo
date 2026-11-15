/*!
 * Local addition: an exploration of the agent desktop's usage glance. Four
 * ways to read a limit against the time left in its window instead of by its
 * share alone, each as the sidebar row and the detail it opens.
 */

import { PROFILES, type Profile } from '../mock'
import NextConcept from './next-concept'
import PaceConcept from './pace-concept'
import RunwayConcept from './runway-concept'
import WordsConcept from './words-concept'

const CONCEPTS = { pace: PaceConcept, words: WordsConcept, next: NextConcept, runway: RunwayConcept }

interface UsageConceptsProps {
  /** Which concept: a pace tick on each line, the one concern in words, the profile for the next session, or each profile's runway until its reset. Defaults to `'pace'`. */
  variant?: keyof typeof CONCEPTS
  /** `sidebar`: the glance in a Sidebar row whose press opens the detail; `detail`: the detail alone, as the popover draws it. Defaults to `'sidebar'`. */
  form?: 'sidebar' | 'detail'
  /** The profiles to show. Defaults to the mock jobiflow, work, work-personal and zcode profiles. */
  profiles?: Profile[]
}

/**
 * Usage read against time: is a limit going to last until it resets?
 *
 * A share alone raises the wrong alarm: 78% of a weekly limit that resets
 * tomorrow is room to spend, while 42% of a session an hour in is not. Each
 * limit here carries its window (length and time until reset, from
 * `windows.ts`), and every concept reads the same model (`pace.ts`): the
 * burn rate so far, where it lands at the reset, and whether it runs out
 * first. A limit is free (lasts), watch (lands above 95%) or tight (runs out
 * before its reset); only watch and tight take a status hue.
 *
 * - `pace` — today's row, with an even-pace tick on every line and the color
 *   from the verdict.
 * - `words` — the one concern as a sentence, the rest folded into "fine".
 * - `next` — the profile with the most room for the next session, the others
 *   ranked behind it.
 * - `runway` — time instead of share: a full line lasts, a short one runs out.
 *
 * An exploration: put the chosen one in the session sidebar's footer in
 * place of ProfileUsage.
 *
 * @example {@include ./examples.mdx}
 */
export default function UsageConcepts({ variant = 'pace', form = 'sidebar', profiles = PROFILES }: UsageConceptsProps) {
  const Concept = CONCEPTS[variant]
  return <Concept profiles={profiles} form={form} />
}

export type { UsageConceptsProps }
