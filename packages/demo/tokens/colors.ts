import { defineTokens } from 'modo-atomic-ui/tokens'

export default defineTokens({
  group: 'colors',
  description: '8-level surface ladder + foreground + accent. The fluidfunctionalism-look reference.',
  items: {
    'surface-1':  { value: '#fafafa', semantic: 'bg',     role: 'surface' },
    'surface-2':  { value: '#fcfcfc', semantic: 'bg',     role: 'surface' },
    'surface-3':  { value: '#ffffff', semantic: 'bg',     role: 'surface' },
    'surface-4':  { value: '#ffffff', semantic: 'bg',     role: 'surface' },
    'surface-5':  { value: '#ffffff', semantic: 'bg',     role: 'surface' },
    'surface-6':  { value: '#ffffff', semantic: 'bg',     role: 'surface' },
    'surface-7':  { value: '#ffffff', semantic: 'bg',     role: 'surface' },
    'surface-8':  { value: '#ffffff', semantic: 'bg',     role: 'surface' },
    background:    { value: '#fafafa', semantic: 'bg',     role: 'surface' },
    foreground:    { value: '#171717', semantic: 'fg',     role: 'text' },
    'muted':       { value: '#f4f4f5', semantic: 'bg',     role: 'surface' },
    'muted-foreground': { value: '#737373', semantic: 'fg', role: 'text' },
    border:        { value: 'color-mix(in oklab, #171717 12%, transparent)', semantic: 'border', role: 'stroke' },
    accent:        { value: '#3b82f6', semantic: 'bg',     role: 'brand' },
    'accent-foreground': { value: '#ffffff', semantic: 'fg', role: 'text' },
  },
})
