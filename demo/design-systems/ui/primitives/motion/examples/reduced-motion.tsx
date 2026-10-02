import Motion from '..'

<div className="flex w-full flex-wrap items-start justify-center gap-8">
  <div className="flex flex-col items-center gap-3">
    <Motion tier="slow" reducedMotion="never">
      <div className="h-20 w-40 rounded-xl bg-surface-5 shadow-surface-5" />
    </Motion>
    <span className="text-caption text-muted-foreground">Full motion</span>
  </div>
  <div className="flex flex-col items-center gap-3">
    <Motion tier="slow" reducedMotion="always">
      <div className="h-20 w-40 rounded-xl bg-surface-5 shadow-surface-5" />
    </Motion>
    <span className="text-caption text-muted-foreground">Reduced motion — opacity only</span>
  </div>
</div>
