import './login-form.css'
import Button from '../../primitives/button'
import Input from '../../primitives/input'

/**
 * Composed block: input + input + button. Uses primitives directly.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <LoginForm />
 * ```
 *
 * @example
 * # With onSubmit
 *
 * ```tsx
 * <LoginForm onSubmit={() => console.log('submitted')} />
 * ```
 */
export default function LoginForm({
  onSubmit,
}: {
  /** Called on form submit. @default noop */
  onSubmit?: () => void
} = {}) {
  return (
    <form
      className="my-login-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      <h2 className="my-login-form-title">Sign in</h2>
      <Input placeholder="email@example.com" />
      <Input type="password" placeholder="password" />
      <Button type="submit">Sign in</Button>
      <div className="my-login-form-hint">demo only — no real auth</div>
    </form>
  )
}
