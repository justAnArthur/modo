import Box from '@mui/material/Box'
import ListItemButton from '@mui/material/ListItemButton'
import SvgIcon from '@mui/material/SvgIcon'
import Typography from '@mui/material/Typography'
import { createContext, type ReactNode, useContext } from 'react'
import { MuiProvider } from './theme'

/** How deep a Section sits: a tier is 0, a group folder inside it 1, and so on. */
const Depth = createContext(0)

/**
 * The docs chrome's nav, drawn with MUI's list parts: a section is a subtitle
 * over dense ListItemButtons, the current page selected.
 * Pinned as the Sidebar slot in modo.config.ts; docs-only, so not an item.
 */
export function Sidebar({ children }: { children?: ReactNode }) {
  return (
    <MuiProvider>
      <Box component="nav" data-modo="sidebar-nav">
        {children}
      </Box>
    </MuiProvider>
  )
}

function SidebarSection({ title, children }: { title: string; children?: ReactNode }) {
  const depth = useContext(Depth)
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography
        variant={depth === 0 ? 'subtitle2' : 'caption'}
        component="h3"
        color={depth === 0 ? 'textPrimary' : 'textSecondary'}
        sx={{ m: 0, px: 1, pt: depth === 0 ? 0 : 1, pb: 0.5 }}
      >
        {title}
      </Typography>
      <Depth.Provider value={depth + 1}>{children}</Depth.Provider>
    </Box>
  )
}

function SidebarItem({ href, active, children }: { href: string; active?: boolean; children?: ReactNode }) {
  return (
    <ListItemButton
      component="a"
      href={href}
      selected={active}
      aria-current={active ? 'page' : undefined}
      dense
      sx={{ borderRadius: 1, px: 1, py: 0.5, flexGrow: 0 }}
    >
      <Typography variant="body2" component="span" color={active ? 'primary' : 'textPrimary'}>
        {children}
      </Typography>
    </ListItemButton>
  )
}

Sidebar.Item = SidebarItem
Sidebar.Section = SidebarSection

/** Material icon paths (Apache 2.0) for the chrome's names; GitHub's mark is Simple Icons (CC0). */
const ICONS: Record<string, string> = {
  code: 'M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
  external:
    'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  moon: 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z',
  sun: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
}

/** The chrome's icons as MUI SvgIcons; a name with no path draws its label. Docs-only, pinned in modo.config.ts. */
export function Icon({
  name,
  label,
}: {
  /** Which icon to draw: a chrome name or a `socials` key. */
  name: string
  /** Accessible text, drawn for a name with no path. */
  label: string
}) {
  const d = ICONS[name]
  if (!d) return <>{label}</>
  return (
    <SvgIcon fontSize="small" aria-hidden>
      <path d={d} />
    </SvgIcon>
  )
}
