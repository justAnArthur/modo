/*!
 * Local addition: the AI app's plugin catalog. Plugins, skills and MCP
 * servers from the marketplaces you added, searched and filtered by
 * category, each opening into its README and contents, with install,
 * update and uninstall. A Dialog with a static panel.
 */

'use client'

import { type ReactElement, useState } from 'react'
import Markdown from '../../../components/AI/markdown'
import Badge, { type BadgeColor } from '../../../components/badge'
import Button from '../../../components/button'
import EmptyState from '../../../components/empty-state'
import ChoiceList from '../../../components/inputs/choice-list'
import Input from '../../../components/inputs/input'
import Select from '../../../components/inputs/select'
import TabsSubtle from '../../../components/navigation/tabs-subtle'
import Dialog from '../../../components/overlays/dialog'
import { useIcon } from '../../../lib/icon-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import ScrollArea from '../../../primitives/scroll-area'

export type CatalogKind = 'skill' | 'command' | 'agent' | 'hook' | 'mcp'

/** One thing a plugin ships. */
export interface CatalogContent {
  kind: CatalogKind
  name: string
  description?: string
}

/** A plugin as a marketplace lists it. */
export interface CatalogPlugin {
  id: string
  name: string
  author: string
  /** The marketplace it comes from. */
  marketplace: string
  description: string
  category: string
  /** The latest version the marketplace offers. */
  version: string
  /** The installed version; absent when it isn't installed. */
  installed?: string
  /** Its README, in Markdown. */
  readme: string
  contents: CatalogContent[]
}

const KIND: Record<CatalogKind, { label: string; color: BadgeColor }> = {
  skill: { label: 'Skill', color: 'blue' },
  command: { label: 'Command', color: 'violet' },
  agent: { label: 'Agent', color: 'amber' },
  hook: { label: 'Hook', color: 'teal' },
  mcp: { label: 'MCP', color: 'green' },
}

const ALL = 'all'

const kindsOf = (plugin: CatalogPlugin) => [...new Set(plugin.contents.map(c => c.kind))]

function matches(plugin: CatalogPlugin, query: string, category: string) {
  if (category !== ALL && plugin.category !== category) return false
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [plugin.name, plugin.author, plugin.description, plugin.marketplace, ...kindsOf(plugin)].some(text =>
    text.toLowerCase().includes(q),
  )
}

function Kinds({ plugin }: { plugin: CatalogPlugin }) {
  return (
    <span className="flex flex-wrap gap-[var(--space-1)]">
      {kindsOf(plugin).map(kind => (
        <Badge key={kind} size="compact" color={KIND[kind].color}>
          {KIND[kind].label}
        </Badge>
      ))}
    </span>
  )
}

function state(plugin: CatalogPlugin) {
  if (!plugin.installed) return undefined
  return plugin.installed === plugin.version
    ? `Installed ${plugin.installed}`
    : `Update ${plugin.installed} → ${plugin.version}`
}

interface Handlers {
  pending: string[]
  onInstall?: (id: string) => void
  onUninstall?: (id: string) => void
  onUpdate?: (id: string) => void
}

/** The one action a row offers, or every action the detail does. */
function Actions({ plugin, handlers, all = false }: { plugin: CatalogPlugin; handlers: Handlers; all?: boolean }) {
  const Install = useIcon('arrow-down')
  const Refresh = useIcon('refresh-cw')
  const Trash = useIcon('trash')
  const busy = handlers.pending.includes(plugin.id)
  const outdated = plugin.installed !== undefined && plugin.installed !== plugin.version

  if (!plugin.installed)
    return (
      <Button size="compact" leadingIcon={Install} loading={busy} onClick={() => handlers.onInstall?.(plugin.id)}>
        Install
      </Button>
    )

  return (
    <span className="flex gap-[var(--space-1)]">
      {outdated && (
        <Button size="compact" leadingIcon={Refresh} loading={busy} onClick={() => handlers.onUpdate?.(plugin.id)}>
          Update
        </Button>
      )}
      {(all || !outdated) && (
        <Button
          size="compact"
          variant="ghost"
          leadingIcon={Trash}
          loading={busy && !outdated}
          onClick={() => handlers.onUninstall?.(plugin.id)}
        >
          Uninstall
        </Button>
      )}
    </span>
  )
}

function Detail({ plugin, handlers, onBack }: { plugin: CatalogPlugin; handlers: Handlers; onBack: () => void }) {
  const Back = useIcon('arrow-left')
  return (
    <div className="flex min-w-0 flex-col gap-[var(--space-4)]">
      <Button variant="ghost" size="compact" leadingIcon={Back} className="self-start @2xl:hidden" onClick={onBack}>
        All plugins
      </Button>
      <div className="flex flex-wrap items-start gap-[var(--space-3)]">
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
          <h3 className="m-0 text-subtitle text-foreground">{plugin.name}</h3>
          <span className="text-caption text-muted-foreground">
            {plugin.author} · {plugin.marketplace} · {plugin.version}
            {state(plugin) && ` · ${state(plugin)}`}
          </span>
        </div>
        <Actions plugin={plugin} handlers={handlers} all />
      </div>
      <p className="m-0 text-body text-foreground">{plugin.description}</p>
      <Kinds plugin={plugin} />
      <TabsSubtle size="compact" aria-label={`${plugin.name} details`}>
        <TabsSubtle.Item index={0} label="README" />
        <TabsSubtle.Item index={1} label={`Contents · ${plugin.contents.length}`} />
        <TabsSubtle.Panel index={0} className="pt-[var(--space-3)]">
          <Markdown>{plugin.readme}</Markdown>
        </TabsSubtle.Panel>
        <TabsSubtle.Panel index={1} className="pt-[var(--space-3)]">
          <ul aria-label="Contents" className="m-0 flex list-none flex-col p-0">
            {plugin.contents.map(item => (
              <li
                key={`${item.kind}-${item.name}`}
                className="flex min-w-0 items-baseline gap-[var(--space-3)] border-b border-border py-[var(--space-2)] last:border-b-0"
              >
                <span className="w-20 shrink-0">
                  <Badge size="compact" color={KIND[item.kind].color}>
                    {KIND[item.kind].label}
                  </Badge>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-caption text-foreground">{item.name}</span>
                  {item.description && <span className="text-caption text-muted-foreground">{item.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        </TabsSubtle.Panel>
      </TabsSubtle>
    </div>
  )
}

interface PluginCatalogPanelProps {
  /** Everything the marketplaces list. */
  plugins: CatalogPlugin[]
  /** Controlled search query. Pair with `onQueryChange`. */
  query?: string
  /** Initial query, for an uncontrolled catalog. Defaults to `''`. */
  defaultQuery?: string
  /** Called on every change of the query. */
  onQueryChange?: (query: string) => void
  /** Initial category; `'all'` shows every one. Defaults to `'all'`. */
  defaultCategory?: string
  /** Controlled id of the plugin whose detail shows. Pair with `onSelectedChange`. */
  selected?: string
  /** Id of the plugin whose detail shows first. Defaults to none. */
  defaultSelected?: string
  /** Called with the id of the plugin picked for its detail. */
  onSelectedChange?: (id: string) => void
  /** Ids being installed, updated or uninstalled: their button spins. Defaults to `[]`. */
  pending?: string[]
  /** Called with a plugin's id when Install is pressed. */
  onInstall?: (id: string) => void
  /** Called with a plugin's id when Uninstall is pressed. */
  onUninstall?: (id: string) => void
  /** Called with a plugin's id when Update is pressed. */
  onUpdate?: (id: string) => void
  /** Classes for the root. */
  className?: string
}

/** The catalog without the Dialog: for a settings page, or the docs. */
function PluginCatalogPanel({
  plugins,
  query,
  defaultQuery = '',
  onQueryChange,
  defaultCategory = ALL,
  selected,
  defaultSelected = '',
  onSelectedChange,
  pending = [],
  onInstall,
  onUninstall,
  onUpdate,
  className,
}: PluginCatalogPanelProps) {
  const [q, setQ] = useControllableState(query, defaultQuery, onQueryChange)
  const [category, setCategory] = useState(defaultCategory)
  const [picked, setPicked] = useControllableState(selected, defaultSelected, onSelectedChange)
  const SearchIcon = useIcon('search')
  const Package = useIcon('package')
  const handlers = { pending, onInstall, onUninstall, onUpdate }
  const categories = [...new Set(plugins.map(p => p.category))].sort()
  const shown = plugins.filter(p => matches(p, q, category))
  const detail = plugins.find(p => p.id === picked)

  return (
    <div className={cn('@container flex min-h-0 flex-col gap-[var(--space-4)]', className)}>
      <div className="flex flex-wrap items-center gap-[var(--space-2)] pr-[var(--space-6)]">
        <h2 className="m-0 mr-auto text-title text-foreground">Plugin catalog</h2>
        <Input
          variant="bordered"
          size="compact"
          icon={SearchIcon}
          aria-label="Search plugins"
          placeholder="Search plugins, skills, MCP…"
          className="w-60"
          value={q}
          onChange={setQ}
        />
        <Select size="compact" value={category} onValueChange={setCategory}>
          <Select.Trigger aria-label="Category" className="w-40" />
          <Select.Content>
            <Select.Item index={0} value={ALL}>
              All categories
            </Select.Item>
            {categories.map((c, i) => (
              <Select.Item key={c} index={i + 1} value={c}>
                {c}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-[var(--space-6)] @2xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <ScrollArea className={cn('min-h-0', detail && 'hidden @2xl:block')} viewportClassName="scroll-fade">
          {shown.length === 0 ? (
            <EmptyState
              size="compact"
              icon={SearchIcon}
              title="No plugins match"
              description={
                q.trim()
                  ? `Nothing in ${category === ALL ? 'the catalog' : category} matches “${q.trim()}”.`
                  : `Nothing in ${category}.`
              }
              actions={
                <Button
                  size="compact"
                  variant="secondary"
                  onClick={() => {
                    setQ('')
                    setCategory(ALL)
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <ChoiceList
              label="Plugins"
              value={picked}
              onValueChange={setPicked}
              rowClassName="pr-24"
              options={shown.map(plugin => ({
                value: plugin.id,
                label: plugin.name,
                actions: <Actions plugin={plugin} handlers={handlers} />,
                content: (
                  <span className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
                    <span className="flex min-w-0 items-baseline gap-[var(--space-2)]">
                      <span className="truncate weight-medium text-foreground">{plugin.name}</span>
                      <span className="shrink-0 truncate text-caption text-muted-foreground">{plugin.author}</span>
                    </span>
                    <span className="line-clamp-2 text-caption text-muted-foreground">{plugin.description}</span>
                    <span className="flex flex-wrap items-center gap-[var(--space-2)]">
                      <Kinds plugin={plugin} />
                      {state(plugin) && <span className="text-caption text-muted-foreground">{state(plugin)}</span>}
                    </span>
                  </span>
                ),
              }))}
            />
          )}
        </ScrollArea>

        <ScrollArea className={cn('min-h-0', !detail && 'hidden @2xl:block')} viewportClassName="scroll-fade">
          {detail ? (
            <Detail plugin={detail} handlers={handlers} onBack={() => setPicked('')} />
          ) : (
            <EmptyState
              size="compact"
              icon={Package}
              title="Pick a plugin"
              description="Its README and what it ships show here."
            />
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

interface PluginCatalogProps {
  /** Everything the marketplaces list. */
  plugins: CatalogPlugin[]
  /** The control that opens it, such as the plugins section's "Browse catalog" button. */
  trigger?: ReactElement
  /** Controlled open state. */
  open?: boolean
  /** Initial open state, for an uncontrolled dialog. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Initial query. Defaults to `''`. */
  defaultQuery?: string
  /** Initial category; `'all'` shows every one. Defaults to `'all'`. */
  defaultCategory?: string
  /** Id of the plugin whose detail shows first. Defaults to none. */
  defaultSelected?: string
  /** Ids being installed, updated or uninstalled: their button spins. Defaults to `[]`. */
  pending?: string[]
  /** Called with a plugin's id when Install is pressed. */
  onInstall?: (id: string) => void
  /** Called with a plugin's id when Uninstall is pressed. */
  onUninstall?: (id: string) => void
  /** Called with a plugin's id when Update is pressed. */
  onUpdate?: (id: string) => void
}

/**
 * Browse what the marketplaces offer, and install it: plugins that bundle
 * skills, commands, agents, hooks and MCP servers.
 *
 * Search by name, author, description or kind, and narrow to a category.
 * Each row names the plugin and its author, says what it does, badges what
 * it ships, and says whether it is installed or has an update; its Install,
 * Update or Uninstall shows on hover. Pick a row and its detail opens
 * beside the list (in place of it, in a narrow window): the README, and
 * the contents one by one. Nothing matching shows an empty state that
 * clears the filters. The app does the installing: `onInstall`,
 * `onUninstall` and `onUpdate` get the id, and `pending` spins the
 * button meanwhile. The dialog grows out of its trigger;
 * `PluginCatalog.Panel` is the same catalog without it.
 *
 * Statics:
 * - `PluginCatalog.Panel` — the catalog on its own: the same props, minus the dialog's, plus a controlled `query` and `selected`.
 *
 * @example {@include ./examples.mdx}
 */
function PluginCatalog({ trigger, open, defaultOpen = false, onOpenChange, ...panel }: PluginCatalogProps) {
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange)
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <Dialog.Trigger render={trigger} />}
      <Dialog.Content size="xl" aria-label="Plugin catalog" className="flex h-[min(640px,85dvh)] flex-col">
        <PluginCatalogPanel {...panel} className="flex-1" />
      </Dialog.Content>
    </Dialog>
  )
}

PluginCatalog.Panel = PluginCatalogPanel

export type { PluginCatalogPanelProps, PluginCatalogProps }
export { PluginCatalogPanel }

export default PluginCatalog
