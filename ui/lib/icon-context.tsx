/*!
 * Vendored from Fluid Functionalism — `registry/default/lib/icon-context.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 *
 * Local modifications:
 * - lucide-react v1 + React 18 types: `IconComponentProps.size` /
 *   `strokeWidth` widened to `number | string` (lucide icons' propTypes
 *   accept both, and @types/react 18 compares propTypes).
 * - `panel-left-dashed` / `panel-right-dashed`: the sidebar trigger's glyph
 *   while the sidebar opens on hover.
 * - The AI app's glyphs (`terminal` … `history`): tools, panes,
 *   session states and settings sections for `blocks/AI` and
 *   `pages/AI`.
 * - `eye-off` / `grip-vertical`: KeyValue's secret reveal and Sortable's handle.
 */

'use client'

import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  AtSign,
  Ban,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleX,
  Clipboard,
  Clock,
  Cloud,
  Columns2,
  Command,
  Copy,
  CornerDownLeft,
  CornerDownRight,
  Cpu,
  Dot,
  Ellipsis,
  EllipsisVertical,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileDiff,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  Gauge,
  GitBranch,
  GitFork,
  GitPullRequest,
  Globe,
  GripVertical,
  Heart,
  History,
  Home,
  ImageIcon,
  Inbox,
  Key,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Link,
  ListChecks,
  ListTree,
  Loader,
  Lock,
  Mail,
  Menu,
  MessageCircle,
  Minus,
  Monitor,
  Moon,
  Package,
  Paintbrush,
  Palette,
  PanelLeft,
  PanelLeftDashed,
  PanelRight,
  PanelRightDashed,
  Paperclip,
  Pause,
  Pencil,
  PenLine,
  Pin,
  Pipette,
  Play,
  Plug,
  Plus,
  Puzzle,
  RectangleHorizontal,
  RefreshCw,
  Rocket,
  RotateCcw,
  Scaling,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  SkipForward,
  SlidersHorizontal,
  Split,
  Square,
  SquareKanban,
  SquareLibrary,
  Star,
  Sun,
  Terminal,
  TextWrap,
  Trash2,
  TriangleAlert,
  User,
  Users,
  Webhook,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { type ComponentType, createContext, type ReactNode, useContext, useMemo } from 'react'

export interface IconComponentProps {
  size?: number | string
  strokeWidth?: number | string
  className?: string
}

export type IconComponent = ComponentType<IconComponentProps>

export type IconName =
  | 'chevron-right'
  | 'chevron-down'
  | 'x'
  | 'copy'
  | 'menu'
  | 'dot'
  | 'monitor'
  | 'sun'
  | 'moon'
  | 'rectangle-horizontal'
  | 'circle'
  | 'square-library'
  | 'clock'
  | 'star'
  | 'settings'
  | 'plus'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'search'
  | 'loader'
  | 'users'
  | 'lock'
  | 'mail'
  | 'bell'
  | 'shield'
  | 'palette'
  | 'lightbulb'
  | 'rocket'
  | 'heart'
  | 'paintbrush'
  | 'brain'
  | 'globe'
  | 'user'
  | 'image'
  | 'link'
  | 'check'
  | 'rotate-ccw'
  | 'play'
  | 'pause'
  | 'pipette'
  | 'home'
  | 'message-circle'
  | 'inbox'
  | 'pencil'
  | 'scaling'
  | 'skip-forward'
  | 'corner-down-right'
  | 'corner-down-left'
  | 'panel-left'
  | 'panel-left-dashed'
  | 'panel-right'
  | 'panel-right-dashed'
  | 'chevrons-up-down'
  | 'more-horizontal'
  | 'more-vertical'
  | 'calendar'
  | 'folder'
  | 'sliders-horizontal'
  | 'terminal'
  | 'git-branch'
  | 'git-pull-request'
  | 'file'
  | 'file-text'
  | 'file-diff'
  | 'file-plus'
  | 'pin'
  | 'archive'
  | 'columns-2'
  | 'bot'
  | 'zap'
  | 'gauge'
  | 'shield-check'
  | 'puzzle'
  | 'plug'
  | 'webhook'
  | 'git-fork'
  | 'list-checks'
  | 'layers'
  | 'at-sign'
  | 'paperclip'
  | 'clipboard'
  | 'circle-dot'
  | 'circle-alert'
  | 'circle-check'
  | 'circle-x'
  | 'triangle-alert'
  | 'wrench'
  | 'external-link'
  | 'eye'
  | 'list-tree'
  | 'cpu'
  | 'key'
  | 'trash'
  | 'square'
  | 'chevron-up'
  | 'pen-line'
  | 'command'
  | 'book-open'
  | 'server'
  | 'refresh-cw'
  | 'arrow-up-right'
  | 'split'
  | 'ban'
  | 'cloud'
  | 'minus'
  | 'package'
  | 'folder-open'
  | 'history'
  | 'layout-dashboard'
  | 'square-kanban'
  | 'text-wrap'
  | 'eye-off'
  | 'grip-vertical'

export const defaultIcons: Record<IconName, IconComponent> = {
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  pipette: Pipette,
  x: X,
  copy: Copy,
  menu: Menu,
  dot: Dot,
  monitor: Monitor,
  sun: Sun,
  moon: Moon,
  'rectangle-horizontal': RectangleHorizontal,
  circle: Circle,
  'square-library': SquareLibrary,
  clock: Clock,
  star: Star,
  settings: Settings,
  plus: Plus,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  search: Search,
  loader: Loader,
  users: Users,
  lock: Lock,
  mail: Mail,
  bell: Bell,
  shield: Shield,
  palette: Palette,
  lightbulb: Lightbulb,
  rocket: Rocket,
  heart: Heart,
  paintbrush: Paintbrush,
  brain: Brain,
  globe: Globe,
  user: User,
  image: ImageIcon,
  link: Link,
  check: Check,
  'rotate-ccw': RotateCcw,
  play: Play,
  pause: Pause,
  home: Home,
  'message-circle': MessageCircle,
  inbox: Inbox,
  pencil: Pencil,
  scaling: Scaling,
  'skip-forward': SkipForward,
  'corner-down-right': CornerDownRight,
  'corner-down-left': CornerDownLeft,
  'panel-left': PanelLeft,
  'panel-left-dashed': PanelLeftDashed,
  'panel-right': PanelRight,
  'panel-right-dashed': PanelRightDashed,
  'chevrons-up-down': ChevronsUpDown,
  'more-horizontal': Ellipsis,
  'more-vertical': EllipsisVertical,
  calendar: Calendar,
  folder: Folder,
  'sliders-horizontal': SlidersHorizontal,
  terminal: Terminal,
  'git-branch': GitBranch,
  'git-pull-request': GitPullRequest,
  file: File,
  'file-text': FileText,
  'file-diff': FileDiff,
  'file-plus': FilePlus,
  pin: Pin,
  archive: Archive,
  'columns-2': Columns2,
  bot: Bot,
  zap: Zap,
  gauge: Gauge,
  'shield-check': ShieldCheck,
  puzzle: Puzzle,
  plug: Plug,
  webhook: Webhook,
  'git-fork': GitFork,
  'list-checks': ListChecks,
  layers: Layers,
  'at-sign': AtSign,
  paperclip: Paperclip,
  clipboard: Clipboard,
  'circle-dot': CircleDot,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'circle-x': CircleX,
  'triangle-alert': TriangleAlert,
  wrench: Wrench,
  'external-link': ExternalLink,
  eye: Eye,
  'list-tree': ListTree,
  cpu: Cpu,
  key: Key,
  trash: Trash2,
  square: Square,
  'chevron-up': ChevronUp,
  'pen-line': PenLine,
  command: Command,
  'book-open': BookOpen,
  server: Server,
  'refresh-cw': RefreshCw,
  'arrow-up-right': ArrowUpRight,
  split: Split,
  ban: Ban,
  cloud: Cloud,
  minus: Minus,
  package: Package,
  'folder-open': FolderOpen,
  history: History,
  'layout-dashboard': LayoutDashboard,
  'square-kanban': SquareKanban,
  'text-wrap': TextWrap,
  'eye-off': EyeOff,
  'grip-vertical': GripVertical,
}

const IconContext = createContext<Record<IconName, IconComponent> | null>(null)

/**
 * Returns a single icon component for the given name.
 * Falls back to the default (Lucide) set if no provider is present.
 */
function useIcon(name: IconName): IconComponent {
  const icons = useContext(IconContext)
  return (icons ?? defaultIcons)[name]
}

/**
 * Returns the full icon map.
 * Falls back to the default (Lucide) set if no provider is present.
 */
function useIcons(): Record<IconName, IconComponent> {
  const icons = useContext(IconContext)
  return icons ?? defaultIcons
}

/**
 * Swap some or all icons for components from another library.
 * Names left out of `icons` keep their default (Lucide) component.
 */
function IconProvider({ children, icons }: { children: ReactNode; icons?: Partial<Record<IconName, IconComponent>> }) {
  const value = useMemo(() => ({ ...defaultIcons, ...icons }), [icons])
  return <IconContext.Provider value={value}>{children}</IconContext.Provider>
}

export { IconProvider, useIcon, useIcons }
