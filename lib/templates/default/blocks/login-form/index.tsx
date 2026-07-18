/**
 * Composed block: input + button + a hint. Wraps itself in `<Elevated offset={1}>`
 * to sit as a raised card on the page.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <LoginForm />
 * ```
 */
export default function LoginForm({ onSubmit }: { onSubmit?: () => void } = {}) {
  return (
    <form
      data-block="login-form"
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, width: 320 }}
    >
      <div style={{ fontSize: 16, fontWeight: 600 }}>Sign in</div>
      <input placeholder="email@example.com" className="modo-input" data-size="md" defaultValue="ada@lovelace.dev" />
      <input type="password" placeholder="password" className="modo-input" data-size="md" defaultValue="••••••" />
      <button className="modo-button" data-variant="primary" data-size="md">Sign in</button>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textAlign: 'center' }}>demo only — no real auth</div>
    </form>
  )
}
