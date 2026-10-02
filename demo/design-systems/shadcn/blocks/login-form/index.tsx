import { LoginForm as ShadcnLoginForm } from './login-form'

/**
 * shadcn/ui login-02 block — email/password sign-in form with social login.
 * Pulled via `bunx shadcn@latest add login-02` (radix-nova style, neutral
 * base color). The lightest of the registry's login blocks.
 *
 * @example # Default
 * {@includeCode ./examples/default.tsx}
 *
 * @example # On a card
 * Composed with the Card item for a centered auth layout.
 *
 * {@includeCode ./examples/on-a-card.tsx}
 */
export default function LoginForm({ className }: {
  /** Additional classes for the form root, merged by the vendored cn helper. */
  className?: string
}) {
  return <ShadcnLoginForm className={className} />
}
