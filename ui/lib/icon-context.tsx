/*!
 * Ported from Fluid Functionalism — `registry/default/lib/icon-context.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 * Local changes: see PORTING.md.
 */

'use client'

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Circle,
  CircleAlert,
  CircleCheck,
  Clock,
  Copy,
  CornerDownLeft,
  CornerDownRight,
  Dot,
  Ellipsis,
  EllipsisVertical,
  Eye,
  EyeOff,
  File as FileIcon,
  Folder,
  Globe,
  GripVertical,
  Heart,
  Home,
  ImageIcon,
  Inbox,
  Info,
  Lightbulb,
  Link,
  Loader,
  Lock,
  Mail,
  Menu,
  MessageCircle,
  Minus,
  Monitor,
  Moon,
  Paintbrush,
  Palette,
  PanelLeft,
  PanelLeftDashed,
  PanelRight,
  PanelRightDashed,
  Pause,
  Pencil,
  Pipette,
  Play,
  Plus,
  RectangleHorizontal,
  Rocket,
  RotateCcw,
  Scaling,
  Search,
  Settings,
  Shield,
  SkipForward,
  SlidersHorizontal,
  SquareLibrary,
  Star,
  Sun,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react'
import { type ComponentType, createContext, type ReactNode, useContext, useMemo } from 'react'

export interface IconComponentProps {
  size?: number | string
  strokeWidth?: number | string
  className?: string
}

export type IconComponent = ComponentType<IconComponentProps>

export type IconName =
  | 'circle-alert'
  | 'info'
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
  | 'arrow-up-down'
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
  | 'minus'
  | 'chevron-left'
  | 'chevrons-left'
  | 'chevrons-right'
  | 'circle-check'
  | 'file'
  | 'upload'
  | 'eye'
  | 'eye-off'
  | 'grip-vertical'

const defaultIcons: Record<IconName, IconComponent> = {
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
  'arrow-up-down': ArrowUpDown,
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
  'circle-alert': CircleAlert,
  info: Info,
  minus: Minus,
  'chevron-left': ChevronLeft,
  'chevrons-left': ChevronsLeft,
  'chevrons-right': ChevronsRight,
  'circle-check': CircleCheck,
  file: FileIcon,
  upload: Upload,
  eye: Eye,
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
 * Swap some or all icons for components from another library.
 * Names left out of `icons` keep their default (Lucide) component.
 */
function IconProvider({ children, icons }: { children: ReactNode; icons?: Partial<Record<IconName, IconComponent>> }) {
  const value = useMemo(() => ({ ...defaultIcons, ...icons }), [icons])
  return <IconContext.Provider value={value}>{children}</IconContext.Provider>
}

export { IconProvider, useIcon }
