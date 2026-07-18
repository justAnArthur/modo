import { defineTokens } from 'modo-atomic-ui/tokens'

export default defineTokens({
  group: 'motion',
  description: 'Durations and easings. All durations in ms. Easings as CSS cubic-bezier() or keyword.',
  durations: {
    instant: { value: '0ms',     ms: 0,   description: 'no transition' },
    fast:    { value: '80ms',    ms: 80,  description: 'color, transform, opacity' },
    normal:  { value: '160ms',   ms: 160, description: 'larger state changes' },
    slow:    { value: '240ms',   ms: 240, description: 'page-level transitions' },
    slower:  { value: '400ms',   ms: 400, description: 'orchestrated sequences' },
  },
  easings: {
    linear:    { value: 'linear' },
    standard:  { value: 'cubic-bezier(0.2, 0, 0, 1)' },
    'standard-out': { value: 'cubic-bezier(0, 0, 0.2, 1)' },
    'standard-in':  { value: 'cubic-bezier(0.4, 0, 1, 1)' },
    emphasized:    { value: 'cubic-bezier(0.2, 0, 0, 1.2)' },
  },
})
