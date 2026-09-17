import { ThemeProvider, createTheme } from '@mui/material/styles'

/**
 * MUI's default theme (light scheme), with `cssVariables: true` so component
 * styles resolve through `--mui-*` custom properties at runtime — the same
 * values `scripts/extract-tokens.ts` mirrors into `tokens/*.css`.
 */
export const muiTheme = createTheme({ cssVariables: true })

/**
 * Wraps children in MUI's ThemeProvider. Every modo adapter mounts this so
 * items render correctly both in docs pages and when inherited by the docs
 * chrome (shell slots), no matter who the parent renderer is.
 */
export function MuiProvider({ children }: { children?: React.ReactNode }) {
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
}
