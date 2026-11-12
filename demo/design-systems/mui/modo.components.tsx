import Box from '@mui/material/Box'
import ListItemButton from '@mui/material/ListItemButton'
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
