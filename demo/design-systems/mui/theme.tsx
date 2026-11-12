import { createTheme, ThemeProvider } from '@mui/material/styles'
import type {} from '@mui/material/themeCssVarsAugmentation'

/**
 * MUI's default theme, light and dark schemes, with CSS variables on so
 * component styles resolve through `--mui-*` custom properties at runtime —
 * the same values `scripts/extract-tokens.ts` mirrors into `tokens/*.css`.
 * The dark scheme keys to the `.dark` class the header's theme toggle writes
 * on `<html>`, so its whole palette (the `*Channel` triplets MUI mixes
 * outlines and hover tints from included) and its dark-only styles follow it.
 */
export const muiTheme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: { light: true, dark: true },
})

/**
 * Wraps children in MUI's ThemeProvider. Every modo adapter mounts this so
 * items render correctly both in docs pages and when inherited by the docs
 * chrome (shell slots), no matter who the parent renderer is.
 *
 * The toggle owns the class: with no node and no storage, MUI never writes
 * or remembers a scheme of its own.
 */
export function MuiProvider({ children }: { children?: React.ReactNode }) {
  return (
    <ThemeProvider theme={muiTheme} colorSchemeNode={null} storageManager={null}>
      {children}
    </ThemeProvider>
  )
}
