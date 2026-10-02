import Motion from '..'

<div className="flex w-full flex-col divide-y divide-border">
  {([
    ['fast', 'Fluid hover · Focus rings · Checkbox · Radio · Tooltip · Table rows · Card grid · Input copy · Slider · Select · Combobox · Color picker · Accordion'],
    ['moderate', 'Dropdown · Tabs indicator · Switch thumb · Selection merge / split'],
    ['slow', 'Dialog'],
  ] as const).map(([tier, uses]) => (
    <div key={tier} className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:gap-6">
      <Motion tier={tier} className="shrink-0 sm:w-56">
        <div className="h-8 w-40 rounded-full bg-foreground" />
      </Motion>
      <span className="text-body text-muted-foreground">{uses}</span>
    </div>
  ))}
</div>
