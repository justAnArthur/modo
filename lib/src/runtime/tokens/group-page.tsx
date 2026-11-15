import { tokens as groups } from 'virtual:modo-tokens'
import type { ReactNode } from 'react'
import type { GroupName } from '../../lib/css'
import { cap, count } from '../../lib/text'
import { ColorGroups, ColorPreview } from './colors'
import { range } from './format'
import { RadiusPreview, RadiusView, SpacingPreview, SpacingView } from './lengths'
import { lengthOf } from './measure'
import { MotionPreview, MotionView } from './motion'
import { declared, type Var } from './parts'
import { TypographyPreview, TypographyView } from './typography'

type View = (props: { vars: Var[]; all: Var[] }) => ReactNode

/** What each group holds, in the chrome's words: never the host's. */
const ABOUT: Record<GroupName, string> = {
  colors: 'Fills, text and borders, each beside its foreground where the system pairs one.',
  typography: 'Families, the type scale and the text roles built from them.',
  spacing: 'The steps for gaps, padding and insets, smallest first.',
  radius: 'Corner rounding, from the subtlest to the roundest.',
  motion: 'Durations and easing curves for transitions.',
}

export function about(group: GroupName): string {
  return ABOUT[group]
}

/** `7 variables, 4px to 32px`: the count, plus the range for length scales. */
export function summary(group: GroupName, vars: Var[]): string {
  const n = count(vars.length, 'variable')
  const span = group === 'spacing' || group === 'radius' ? range(vars.map(lengthOf)) : null
  return span ? `${n}, ${span}` : n
}

export function TokenGroupView({ group }: { group: string }) {
  const g = groups.find(gg => gg.name === group)
  const vars = g ? declared(g.vars) : []
  return (
    <article>
      <header>
        <p data-modo="page-eyebrow">Foundations</p>
        <h1 data-modo="page-title">{cap(group)}</h1>
        <p data-modo="page-lead">{g ? `${ABOUT[g.name]} ${summary(g.name, vars)}.` : null}</p>
      </header>
      {g && vars.length > 0 ? <GroupBody group={g.name} vars={vars} all={g.vars} /> : <Empty />}
    </article>
  )
}

function GroupBody({ group, vars, all }: { group: GroupName; vars: Var[]; all: Var[] }) {
  const View = VIEWS[group]
  return <View vars={vars} all={all} />
}

function Empty() {
  return (
    <p data-modo="token-empty">
      No variables in this group. Add them to <code>tokens/*.css</code>.
    </p>
  )
}

/** A group at a glance, for the Foundations overview. */
export function GroupPreview({ group }: { group: string }) {
  const g = groups.find(gg => gg.name === group)
  if (!g) return null
  const Preview = PREVIEWS[g.name]
  return <Preview vars={declared(g.vars)} all={g.vars} />
}

const VIEWS: Record<GroupName, View> = {
  colors: ColorGroups,
  typography: TypographyView,
  spacing: SpacingView,
  radius: RadiusView,
  motion: MotionView,
}

const PREVIEWS: Record<GroupName, View> = {
  colors: ColorPreview,
  typography: TypographyPreview,
  spacing: SpacingPreview,
  radius: RadiusPreview,
  motion: MotionPreview,
}
