import Motion from '..'

<div className="flex w-full flex-wrap items-start justify-center gap-8">
  <div className="flex flex-col items-center gap-3">
    <Motion tier="slow" sameExit>
      <div className="flex w-56 flex-col gap-2.5 rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="h-3 w-1/2 rounded-full bg-foreground/10" />
        <div className="mt-1 h-2 w-full rounded-full bg-foreground/6" />
        <div className="h-2 w-2/5 rounded-full bg-foreground/6" />
        <div className="mt-3 flex justify-end gap-2">
          <div className="h-6 w-16 rounded-md bg-foreground/10" />
          <div className="h-6 w-16 rounded-md bg-foreground/10" />
        </div>
      </div>
    </Motion>
    <span className="text-caption text-muted-foreground">Same exit time — drags on the way out</span>
  </div>
  <div className="flex flex-col items-center gap-3">
    <Motion tier="slow">
      <div className="flex w-56 flex-col gap-2.5 rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="h-3 w-1/2 rounded-full bg-foreground/10" />
        <div className="mt-1 h-2 w-full rounded-full bg-foreground/6" />
        <div className="h-2 w-2/5 rounded-full bg-foreground/6" />
        <div className="mt-3 flex justify-end gap-2">
          <div className="h-6 w-16 rounded-md bg-foreground/10" />
          <div className="h-6 w-16 rounded-md bg-foreground/10" />
        </div>
      </div>
    </Motion>
    <span className="text-caption text-muted-foreground">Faster exit — gone a tier quicker</span>
  </div>
</div>
