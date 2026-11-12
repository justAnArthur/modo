import { config, logoUrl } from 'virtual:modo-config'
import { Logo, shell } from 'virtual:modo-shell'
import { useSyncExternalStore } from 'react'
import { withBase } from '../router'

/** Labels for well-known `socials` keys; any other key is capitalized. */
const NETWORKS: Record<string, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  npm: 'npm',
  discord: 'Discord',
  x: 'X',
  twitter: 'Twitter',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  figma: 'Figma',
  storybook: 'Storybook',
}

const networkLabel = (key: string) => NETWORKS[key.toLowerCase()] ?? key[0]!.toUpperCase() + key.slice(1)

/** The brand row: logo and name linking home, socials, the theme toggle and, below md, the menu toggle. */
export function Header({ menuOpen, onMenu }: { menuOpen: boolean; onMenu: () => void }) {
  const { Button, Icon, Link } = shell
  return (
    <header data-modo="header">
      <Link href={withBase('/')}>
        <span data-modo="brand">
          {Logo ? <Logo /> : logoUrl ? <img data-modo="brand-logo" src={logoUrl} alt="" /> : null}
          <span data-modo="brand-name">{config.name}</span>
        </span>
      </Link>
      <div data-modo="header-actions">
        {Object.entries(config.socials ?? {}).map(([key, href]) => (
          <Link key={key} href={href} aria-label={networkLabel(key)}>
            <Icon name={key} label={networkLabel(key)} />
          </Link>
        ))}
        {config.theme ? <ThemeToggle /> : null}
        <span data-modo="menu-toggle">
          <Button variant="ghost" size="icon-sm" aria-label="Menu" aria-pressed={menuOpen} onClick={onMenu}>
            <Icon name="menu" label="Menu" />
          </Button>
        </span>
      </div>
    </header>
  )
}

type Mode = 'light' | 'dark'

declare global {
  interface Window {
    /** Set by the inline theme script in the page head (lib/head.ts). */
    __modoTheme?: { get(): Mode; set(mode: Mode): void }
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('modo:themechange', onChange)
  return () => window.removeEventListener('modo:themechange', onChange)
}

function ThemeToggle() {
  const { Button, Icon } = shell
  const mode = useSyncExternalStore(subscribe, () => window.__modoTheme?.get() ?? 'light')
  const next: Mode = mode === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'Dark theme' : 'Light theme'
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} onClick={() => window.__modoTheme?.set(next)}>
      <Icon name={next === 'dark' ? 'moon' : 'sun'} label={label} />
    </Button>
  )
}
