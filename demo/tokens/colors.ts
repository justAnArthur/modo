import { defineTokens } from 'modo-atomic-ui/tokens'

export default defineTokens({
  group: 'colors',
  description: '8-level surface ladder + foreground + accent. The fluidfunctionalism-look reference.',
  items: {
    // surface ladder — each level slightly lighter than the last, so the
    // shadow recipe does the heavy lifting on differentiation. the demo's
    // page bg is --surface-1; cards and popovers lift via --surface-3+.
    'surface-1':  { value: '#f4f4f5', semantic: 'bg',     role: 'surface' },
    'surface-2':  { value: '#f6f6f7', semantic: 'bg',     role: 'surface' },
    'surface-3':  { value: '#f8f8f9', semantic: 'bg',     role: 'surface' },
    'surface-4':  { value: '#fafafa', semantic: 'bg',     role: 'surface' },
    'surface-5':  { value: '#fbfbfc', semantic: 'bg',     role: 'surface' },
    'surface-6':  { value: '#fcfcfd', semantic: 'bg',     role: 'surface' },
    'surface-7':  { value: '#fdfdfd', semantic: 'bg',     role: 'surface' },
    'surface-8':  { value: '#ffffff', semantic: 'bg',     role: 'surface' },
    background:    { value: '#f4f4f5', semantic: 'bg',     role: 'surface' },
    foreground:    { value: '#18181b', semantic: 'fg',     role: 'text' },
    'muted':       { value: '#f4f4f5', semantic: 'bg',     role: 'surface' },
    'muted-foreground': { value: '#71717a', semantic: 'fg', role: 'text' },
    border:        { value: 'color-mix(in oklab, #18181b 10%, transparent)', semantic: 'border', role: 'stroke' },
    accent:        { value: '#3b82f6', semantic: 'bg',     role: 'brand' },
    'accent-foreground': { value: '#ffffff', semantic: 'fg', role: 'text' },
  },
})
