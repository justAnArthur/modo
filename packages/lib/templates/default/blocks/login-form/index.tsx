import { define } from 'modo-atomic-ui/define'
import { Elevated } from 'modo-atomic-ui/surfaces-runtime'

export const meta = define({
  name: 'LoginForm',
  description: 'Composed block: input + button + a hint. Wraps itself in <Elevated offset={1}> to sit as a raised card on the page.',
  category: 'blocks',
})

export function Component() {
  return (
    <Elevated
      offset={1}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        width: 320,
        borderRadius: 'var(--radius-lg, 8px)',
      }}
    >
      <div data-aui="login-form-title" style={{ fontSize: 16, fontWeight: 600 }}>
        Sign in
      </div>
      <input
        data-aui="login-form-email"
        placeholder="email@example.com"
        className="modo-input"
        data-size="md"
        defaultValue="ada@lovelace.dev"
      />
      <input
        data-aui="login-form-password"
        type="password"
        placeholder="password"
        className="modo-input"
        data-size="md"
        defaultValue="••••••"
      />
      <button
        data-aui="login-form-submit"
        className="modo-button"
        data-variant="primary"
        data-size="md"
      >
        Sign in
      </button>
      <div data-aui="login-form-hint" style={{ fontSize: 11, color: 'var(--muted-foreground)', textAlign: 'center' }}>
        demo only — no real auth
      </div>
    </Elevated>
  )
}

export const examples = [
  { name: 'Default', props: {}, children: '' },
] as const

export const props = [] as const
