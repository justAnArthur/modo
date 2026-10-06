import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { MuiProvider } from '../../theme'

/**
 * Sign-in block: Paper + Stack with a Typography heading, email and password
 * TextFields and a contained submit Button. All MUI, no custom CSS.
 *
 * @example {@include ./examples.mdx}
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
          <Typography variant="h5" component="h2">
            {title}
          </Typography>
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
