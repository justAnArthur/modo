import { defineTokens } from 'modo-atomic-ui/tokens'

export default defineTokens({
  group: 'spacing',
  description: 'Modular 4px-base spacing scale. Use for gap, padding, margin.',
  scale: {
    '0':  { value: '0',     px: 0 },
    px:  { value: '1px',   px: 1 },
    '1':  { value: '4px',   px: 4 },
    '2':  { value: '8px',   px: 8 },
    '3':  { value: '12px',  px: 12 },
    '4':  { value: '16px',  px: 16 },
    '5':  { value: '20px',  px: 20 },
    '6':  { value: '24px',  px: 24 },
    '8':  { value: '32px',  px: 32 },
    '10': { value: '40px',  px: 40 },
    '12': { value: '48px',  px: 48 },
    '16': { value: '64px',  px: 64 },
    '20': { value: '80px',  px: 80 },
    '24': { value: '96px',  px: 96 },
  },
})
