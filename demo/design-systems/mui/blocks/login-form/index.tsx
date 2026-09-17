import { MuiProvider } from '../../theme'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

/**
 * Sign-in block: Paper + Stack with email and password TextFields and a
 * contained submit Button. All MUI, no custom CSS.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <LoginForm />
 * ```
 *
 * @example
 * # Custom copy
 *
 * ```tsx
 * <LoginForm title="Welcome back" submitLabel="Continue" />
 * ```
 */
export default function LoginForm({
  title = 'Sign in',
  emailLabel = 'Email',
  passwordLabel = 'Password',
  submitLabel = 'Sign in',
}: {
  /** Heading above the form. @default 'Sign in' */
  title?: string
  /** Email field label. @default 'Email' */
  emailLabel?: string
  /** Password field label. @default 'Password' */
  passwordLabel?: string
  /** Submit button label. @default 'Sign in' */
  submitLabel?: string
}) {
  return (
    <MuiProvider>
      <Paper sx={{ padding: 4, maxWidth: 360 }}>
        <Stack spacing={2}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 500 }}>{title}</h2>
          <TextField label={emailLabel} type="email" autoComplete="email" />
          <TextField label={passwordLabel} type="password" autoComplete="current-password" />
          <Button variant="contained" type="submit">
            {submitLabel}
          </Button>
        </Stack>
      </Paper>
    </MuiProvider>
  )
}
