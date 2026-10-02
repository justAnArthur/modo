All animation comes from one of three springs in `_fluid/lib/springs` (re-exported here as `spring`). Hover states and small toggles use `fast`, dropdowns and tabs use `moderate`, dialogs and drawers use `slow`. No component invents its own timing, so things you've never thought about together move at the same pace.

Each tier's value is the **enter** transition; its `.exit` is the matching **exit** — a plain tween, no bounce, one tier quicker — so a dismissal reads as crisp and final rather than replaying the entrance in reverse. The bigger the thing that moves, the slower the tier. `moderate` is critically damped: it lands exactly with no overshoot, so it also carries panels that must settle precisely.

## Tiers

| Tier | Enter | Exit | Used by |
| --- | --- | --- | --- |
| `spring.fast` | 0.08s, bounce 0 | 0.06s | fluid hover, focus rings, checkbox, radio, tooltip, table rows, card grid, input copy, slider, select, combobox, color picker, accordion |
| `spring.moderate` | 0.16s, bounce 0 | 0.12s | dropdown, tabs indicator, switch thumb, selection merge / split |
| `spring.slow` | 0.24s, bounce 0.12 | 0.16s | dialog and other large surfaces |

## Usage

Enter with `transition={spring.fast}` and leave with `exit={{ opacity: 0, transition: spring.fast.exit }}`. Never hand-write a duration: the values belong in `springs`, not in component code.

- `exitFallbackMs(tier)` (also exported) is the tier's exit in ms plus a 100ms buffer, for deferred-unmount timers that guard an exit tween.
- CSS consumers get the same tiers from `tokens/motion.css`: `--duration-fast` 80ms / `--duration-fast-exit` 60ms, moderate 160 / 120, slow 240 / 160.

## Reduced motion

Every spring respects the OS setting once the app tree is wrapped in `<MotionConfig reducedMotion="user">`. With reduced motion on, position and scale changes drop out and only the opacity fades remain.

## The `Motion` demo

`Motion` itself is a docs demo, not a building block: it shows or hides its children with one tier's enter spring and exit tween (fade + scale + a short rise), with a built-in Show/Hide trigger and a readout of the token it plays. Hidden children keep their space and leave the accessibility tree.
