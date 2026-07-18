import { defineTokens } from 'modo-atomic-ui/tokens'

export default defineTokens({
  group: 'typography',
  description: 'Variable-font axes, families, and a modular type scale.',
  families: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "JetBrains Mono Variable", monospace',
  },
  axes: {
    wght: { min: 100, max: 900, default: 400, description: 'weight' },
    opsz: { min: 9, max: 144, default: 14, description: 'optical size' },
  },
  scale: {
    xs:    { size: '12px', lineHeight: '1.4', letterSpacing: '0' },
    sm:    { size: '13px', lineHeight: '1.4', letterSpacing: '0' },
    base:  { size: '14px', lineHeight: '1.5', letterSpacing: '0' },
    md:    { size: '15px', lineHeight: '1.5', letterSpacing: '0' },
    lg:    { size: '17px', lineHeight: '1.4', letterSpacing: '-0.005em' },
    xl:    { size: '20px', lineHeight: '1.3', letterSpacing: '-0.01em' },
    '2xl': { size: '24px', lineHeight: '1.2', letterSpacing: '-0.015em' },
    '3xl': { size: '30px', lineHeight: '1.15', letterSpacing: '-0.02em' },
  },
})
