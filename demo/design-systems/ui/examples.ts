/*
 * Example scope (modo.config.ts `examples`): every named export here is in
 * scope in every item's `@example` code, next to the item names themselves.
 *
 * Curated from the lucide icons the Fluid Functionalism docs examples use
 * (app/docs/<slug>/page.tsx + fluid-hover/demos.tsx @ b3587bdb — their direct
 * `lucide-react` imports and their `useIcon(...)` names) plus the rest of FF's
 * default icon set (_fluid/lib/icon-context.tsx), so examples read like the
 * FF docs: `leadingIcon={Plus}`, `<Search size={16} />`.
 *
 * Rules: never export a name an item uses (Badge, Button, Card, Table, Tabs,
 * Switch, Slider, Select, Dialog, Tooltip, …) or a shell slot (Link, Code,
 * Sidebar) — items win on a collision anyway, and the icon would be
 * unreachable. Lucide's own `*Icon` aliases cover the clashes (`LinkIcon`,
 * `ImageIcon`). JS/DOM globals examples might use (Map, Set, Image, File,
 * Text, Option, History) are never exported either.
 */

export {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  Clock,
  Copy,
  CornerDownLeft,
  CornerDownRight,
  Dot,
  Ellipsis,
  EllipsisVertical,
  Folder,
  Globe,
  Heart,
  Home,
  ImageIcon,
  Inbox,
  Lightbulb,
  LinkIcon,
  ListFilter,
  Loader,
  Lock,
  Mail,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Paintbrush,
  Palette,
  PanelLeft,
  PanelRight,
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
  SquareKanban,
  SquareLibrary,
  Star,
  Sun,
  Table2,
  User,
  Users,
  X,
} from 'lucide-react'
