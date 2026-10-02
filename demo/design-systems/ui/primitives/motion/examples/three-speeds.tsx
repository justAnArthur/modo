import { Check } from 'lucide-react'
import Motion from '..'

<div className="flex w-full flex-wrap items-start justify-center gap-8">
  <Motion tier="fast">
    <div className="flex h-9 items-center gap-2 rounded-lg bg-hover px-3 text-body text-foreground">
      <Check size={16} /> Hover, fades
    </div>
  </Motion>
  <Motion tier="moderate">
    <div className="flex w-40 flex-col gap-1 rounded-xl bg-surface-3 p-1 text-body text-foreground shadow-surface-3">
      <span className="rounded-lg bg-active px-2 py-1.5">Last updated</span>
      <span className="px-2 py-1.5 text-muted-foreground">Created</span>
      <span className="px-2 py-1.5 text-muted-foreground">Name</span>
    </div>
  </Motion>
  <Motion tier="slow">
    <div className="flex w-48 flex-col gap-2 rounded-2xl bg-surface-5 p-4 shadow-surface-5">
      <span className="text-subtitle font-semibold text-foreground">Create teamspace</span>
      <span className="text-caption text-muted-foreground">Dialogs and drawers land on the slow spring.</span>
    </div>
  </Motion>
</div>
