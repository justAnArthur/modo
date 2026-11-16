/*!
 * The kit's glyphs on top of modo-ui's icon set: tools, panes, session states
 * and settings sections. modo-ui's names resolve through its IconProvider,
 * the kit's own through AiIconProvider, so a host swaps either set.
 */

'use client'

import {
  type IconComponent,
  type IconName as UiIconName,
  useIcons as useUiIcons,
} from '@justanarthur/modo-ui/lib/icon-context'
import {
  Archive,
  ArrowUpRight,
  AtSign,
  Ban,
  BookOpen,
  Bot,
  ChevronUp,
  CircleDot,
  CircleX,
  Clipboard,
  Cloud,
  Columns2,
  Command,
  Cpu,
  ExternalLink,
  FilePlus,
  FileText,
  FolderOpen,
  Gauge,
  GitBranch,
  GitFork,
  GitPullRequest,
  History,
  Key,
  Layers,
  LayoutDashboard,
  ListChecks,
  ListTree,
  Package,
  Paperclip,
  PenLine,
  Pin,
  Plug,
  Puzzle,
  RefreshCw,
  Server,
  ShieldCheck,
  Split,
  SquareKanban,
  Terminal,
  TextWrap,
  Trash2,
  TriangleAlert,
  Webhook,
  Wrench,
  Zap,
} from 'lucide-react'
import { createContext, type ReactNode, useContext, useMemo } from 'react'

const aiIcons = {
  archive: Archive,
  'arrow-up-right': ArrowUpRight,
  'at-sign': AtSign,
  ban: Ban,
  'book-open': BookOpen,
  bot: Bot,
  'chevron-up': ChevronUp,
  'circle-dot': CircleDot,
  'circle-x': CircleX,
  clipboard: Clipboard,
  cloud: Cloud,
  'columns-2': Columns2,
  command: Command,
  cpu: Cpu,
  'external-link': ExternalLink,
  'file-plus': FilePlus,
  'file-text': FileText,
  'folder-open': FolderOpen,
  gauge: Gauge,
  'git-branch': GitBranch,
  'git-fork': GitFork,
  'git-pull-request': GitPullRequest,
  history: History,
  key: Key,
  layers: Layers,
  'layout-dashboard': LayoutDashboard,
  'list-checks': ListChecks,
  'list-tree': ListTree,
  package: Package,
  paperclip: Paperclip,
  'pen-line': PenLine,
  pin: Pin,
  plug: Plug,
  puzzle: Puzzle,
  'refresh-cw': RefreshCw,
  server: Server,
  'shield-check': ShieldCheck,
  split: Split,
  'square-kanban': SquareKanban,
  terminal: Terminal,
  'text-wrap': TextWrap,
  trash: Trash2,
  'triangle-alert': TriangleAlert,
  webhook: Webhook,
  wrench: Wrench,
  zap: Zap,
} satisfies Record<string, IconComponent>

/** A glyph only the kit draws. */
type AiIconName = keyof typeof aiIcons

/** Every name the kit's items read: modo-ui's set plus the kit's own. */
type IconName = UiIconName | AiIconName

const AiIconContext = createContext<Record<AiIconName, IconComponent> | null>(null)

/** The whole map: modo-ui's icons (through its IconProvider) and the kit's (through AiIconProvider). */
function useIcons(): Record<IconName, IconComponent> {
  const ui = useUiIcons()
  const ai = useContext(AiIconContext) ?? aiIcons
  return useMemo(() => ({ ...ui, ...ai }), [ui, ai])
}

/** One icon by name, from either set. */
function useIcon(name: IconName): IconComponent {
  return useIcons()[name]
}

/**
 * Swap some or all of the kit's own glyphs. Names left out keep their Lucide
 * component; modo-ui's names are swapped with its IconProvider.
 */
function AiIconProvider({
  children,
  icons,
}: {
  children: ReactNode
  icons?: Partial<Record<AiIconName, IconComponent>>
}) {
  const value = useMemo(() => ({ ...aiIcons, ...icons }), [icons])
  return <AiIconContext.Provider value={value}>{children}</AiIconContext.Provider>
}

export type { AiIconName, IconComponent, IconName }
export { AiIconProvider, useIcon, useIcons }
