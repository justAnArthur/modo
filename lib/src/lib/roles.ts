/** The contract's type roles (shell/css/contract.css), each with the tag it renders as. */
export const TYPE_ROLES = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  p: 'p',
  lead: 'p',
  eyebrow: 'p',
  sm: 'p',
  xs: 'p',
} as const

export type TypeRole = keyof typeof TYPE_ROLES

/** The roles the chrome dims when the host sets no `--color-<role>`. */
export const MUTED_ROLES: readonly TypeRole[] = ['lead', 'eyebrow']
