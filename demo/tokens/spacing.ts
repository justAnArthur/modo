import { defineTokens } from 'modo-atomic-ui/tokens'

export default defineTokens({
  group: 'spacing',
  description: 'T-shirt spacing scale. Use for gap, padding, margin. Pairs with --spacing-multiplier on <html data-density="...">.',
  scale: {
    '0':   { value: '0',     px: 0  },
    px:   { value: '1px',   px: 1  },
    xxs:  { value: '2px',   px: 2  },
    xs:   { value: '4px',   px: 4  },
    sm:   { value: '8px',   px: 8  },
    md:   { value: '12px',  px: 12 },
    lg:   { value: '16px',  px: 16 },
    xl:   { value: '24px',  px: 24 },
    '2xl': { value: '32px',  px: 32 },
    '3xl': { value: '48px',  px: 48 },
  },
})
