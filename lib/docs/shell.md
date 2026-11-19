# Shell inheritance

The docs chrome renders with your components. It has seven slots. For each, modo looks for one of your items that fits; a slot with no fit uses a plain HTML fallback. So a design system with a Button, Link and Sidebar gets a docs site built from them, with no config.

## How a slot is filled

For each slot, in order:

1. **Pinned.** If [`shell`](./config.md#shell) in modo.config.ts names a module for the slot, that module's export is used.
2. **Matched.** Otherwise modo takes an item in the slot's tier whose name equals the slot's name (case-insensitive) and whose props type lists every prop the slot requires. Optional props count: the name just has to appear in the parsed props. If several match, the first by id wins.
3. **Fallback.** Otherwise the slot uses the lib's Plain component: semantic HTML with no visuals.

| Slot | Matched in | Name | Required props | Fallback |
| --- | --- | --- | --- | --- |
| Button | `primitives/` | `Button` | `children` | `<button type="button">` |
| Link | `primitives/` | `Link` | `href`, `children` | `<a>` |
| Code | `primitives/` | `Code` | `children` | `<pre><code>` |
| Icon | `primitives/` | `Icon` | `name` | the label as text |
| Select | `components/` | `Select` | `value`, `onValueChange`, `options` | `<select>` |
| Sidebar | `components/` | `Sidebar` | `children` | `<nav>` |
| SiteSwitcher | `components/` | `SiteSwitcher` | `pages`, `sections` | a badge and a menu of links |

The name is the default export's function or const name, not the folder name. Props come from the item's props table (see [items.md](./items.md#props)), so `children` must be visible there: inherited from another package's typings (`ButtonHTMLAttributes`), it's left out; the slot types below count. A Select that declares `onChange` instead of `onValueChange` doesn't match.

## Typing slot components

Each slot's props are exported from `@justanarthur/modo`: `ButtonSlotProps`, `LinkSlotProps`, `CodeSlotProps`, `IconSlotProps` (and `IconName`), `SelectSlotProps` (and `SelectOption`), `SidebarSlotProps`, `SidebarItemProps`, `SidebarSectionProps`, `SiteSwitcherSlotProps` (and `SiteSwitcherPage`, `SiteSwitcherSection`, `SiteSwitcherLink`, `SiteCorner`). `ShellComponents` is the whole resolved chrome and `PanelItemProps` a panel item's props. Type a pinned adapter with them:

```tsx
// modo.components.tsx
import type { SelectSlotProps } from '@justanarthur/modo'
import MySelect from './components/select'

export function Select({ value, onValueChange, options }: SelectSlotProps) {
  return (
    <MySelect value={value} onValueChange={onValueChange}>
      {options.map(o => (
        <MySelect.Item key={o.value} value={o.value}>{o.label}</MySelect.Item>
      ))}
    </MySelect>
  )
}
```

A matched item still needs the props declared in its own same-file type, since matching reads the parsed props.

A pin wins even over a matching item. A pin that doesn't load (missing file, failed build, no such export) prints a `[modo:shell] warning:` and the slot falls through to matching.

## Pinning slots

A `shell` value is a path relative to the project root (a file, or a folder with an `index.tsx`) or a package specifier such as `@acme/ds/docs#DocsNav`, resolved through the package's `exports` (see [config.md](./config.md#package-specifiers)). Add `#Name` for a named export. Several pins into one file share one build entry, so you can keep all docs-only adapters in one `modo.components.tsx`.

```ts
// ui/modo.config.ts
shell: {
  Button: './components/button',
  Select: './modo.components.tsx#Select',
  Icon: './modo.components.tsx#Icon',
  Sidebar: './modo.components.tsx#DocsNav',
},
```

Pin a slot when your component has another name, lives in another tier, needs an adapter, or is docs-only and shouldn't be an item.

## Slot contracts

Beyond its required props, each slot receives a few more. Forward them.

### Button

The chrome's icon buttons: copy code, show code, open full screen, theme toggle, menu, canvas zoom.

```tsx
<Button variant="ghost" size="icon-sm" aria-label="Show code" aria-pressed={open} onClick={toggle}>
  <Icon name="code" label="Code" />
</Button>
```

It gets `variant="ghost"`, `size="icon-sm"`, `aria-label`, `onClick`, and `aria-pressed` on toggles. Open full screen also gets `onAuxClick`, and reads the click event `onClick` is called with: forward both, so a modified or middle click opens the example in a new tab. The child is an `Icon` or a short text glyph.

### Link

Every chrome and Markdown link: nav, header, heading anchors, Source links, links in your prose.

It gets `href` and `children`. It also gets `aria-label` on icon-only anchors (heading `#` links, socials) and `title` from Markdown links. Root-relative hrefs already include the site's base.

The chrome puts its `data-modo` hooks on wrappers, so your Link needn't forward data attributes.

### Code

Every code block: fenced Markdown, `{@includeCode}`, Show code on examples.

```tsx
<Code language="tsx">{source}</Code>
```

It gets `language` (may be undefined) and the code as one string child. The copy button is the chrome's, drawn with your Button and Icon.

### Icon

The chrome asks for icons by name and draws them inside your Button or Link.

```tsx
<Icon name="copy" label="Copy code" />
```

`name` is one of:

| Name | Where |
| --- | --- |
| `code` | Show code on an example. |
| `copy`, `check` | Copy code, and its done state. |
| `link` | Heading anchors. |
| `menu` | The nav toggle on small screens. |
| `maximize` | Open full screen on an example. |
| `close` | The nav toggle while the drawer is open, and closing a full-screen example. |
| `sun`, `moon` | The theme toggle (with [`theme`](./config.md#theme)). |
| a [`socials`](./config.md#socials) key | `github`, `npm`, or whatever key you used. |

`label` is the accessible text. Draw the label for a name you have no glyph for; the fallback `PlainIcon` always draws the label.

```tsx
// demo/design-systems/shadcn/_shell/icon.tsx, trimmed
import type { IconSlotProps } from '@justanarthur/modo'
import { Check, CodeXml, Copy, Link2, type LucideIcon, Menu, Moon, Sun } from 'lucide-react'

const icons: Record<string, LucideIcon> = { code: CodeXml, copy: Copy, check: Check, link: Link2, menu: Menu, sun: Sun, moon: Moon }

export default function Icon({ name, label }: IconSlotProps) {
  const Glyph = icons[name]
  return Glyph ? <Glyph size={16} strokeWidth={1.5} aria-hidden /> : label
}
```

### Select

The chrome itself doesn't render a Select. It is handed to [panel items](./config.md#panel) through their `shell` prop, for switchers and similar controls.

```tsx
<shell.Select value={current} onValueChange={(value: string) => go(value)} options={[{ value: 'a', label: 'A' }]} />
```

It gets `value`, `onValueChange(value: string)` (the value, not an event) and `options: { value: string; label: string }[]` (`SelectSlotProps`).

### Sidebar

One Sidebar drives both sides: the left nav and the right panel (table of contents and panel items). The chrome renders it as a compound:

```tsx
<Sidebar>
  <Sidebar.Section title="Primitives">
    <Sidebar.Item href="/docs/primitives" active={false}>All primitives</Sidebar.Item>
    <Sidebar.Item href="/docs/primitives/button" active>Button</Sidebar.Item>
  </Sidebar.Section>
</Sidebar>
```

| Part | Props |
| --- | --- |
| Root | `children` |
| `Item` | `href`, `children`, `active` (the current page) |
| `Section` | `title`, `children`. Group folders nest a Section inside a Section. |

Give the root its parts as statics:

```tsx
// demo/design-systems/filled/components/sidebar/index.tsx, trimmed
export default function Sidebar({ children }: { children?: React.ReactNode }) {
  return <nav className="my-sidebar">{children}</nav>
}

function SidebarItem({ href, active, children }: { href: string; active?: boolean; children?: React.ReactNode }) {
  return (
    <a href={href} aria-current={active ? 'page' : undefined} className="my-sidebar-item">
      {children}
    </a>
  )
}

function SidebarSection({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="my-sidebar-section">
      <h3 className="my-sidebar-section-title">{title}</h3>
      <div className="my-sidebar-section-items">{children}</div>
    </div>
  )
}

Sidebar.Item = SidebarItem
Sidebar.Section = SidebarSection
```

When the root is pinned or matched, `Sidebar.Item` and `Sidebar.Section` come from its statics; a missing static uses the Plain part. Only when the root itself falls back does modo look for separate `Item` (`href`, `children`) and `Section` (`title`, `children`) items in `components/`.

### SiteSwitcher

The [site view](./config.md#pages)'s page switcher: a trigger and the menu it opens, over the page at `/site/<id>`. Only a site with `pages/` renders it.

```tsx
<SiteSwitcher
  name="Acme"
  logo={<Logo />}
  pages={[{ id: 'home', title: 'Home', href: '/site/home', current: true }, …]}
  current="Home"
  sections={[{ label: 'Theme', content: <ThemeSwitcher shell={shell} /> }]}
  links={[{ label: 'Docs', href: '/' }, { label: 'Canvas', href: '/canvas' }]}
  corner="bottom-left"
/>
```

| Prop | |
| --- | --- |
| `name` | the site's name |
| `logo` | the [`logo`](./config.md#logo), rendered (component or `<img>`); undefined without one |
| `pages` | `{ id, title, href, current }[]`, in menu order (`pages.primary`, else nav order) |
| `current` | the title of the page on screen, listed or not; undefined when the id names no page |
| `sections` | the [`panel`](./config.md#panel) items, rendered: `{ label, content }[]` |
| `links` | the way out of the site view: `{ label, href }[]` (Docs, Canvas) |
| `corner` | `bottom-left` \| `bottom-right` \| `top-left` \| `top-right`: where the trigger sits, so open the menu away from the edges |

modo keeps the switcher in a fixed box (`site-indicator`) in its corner and drags that box to another corner (remembered per browser); a press that ends a drag never reaches the trigger. So the slot only opens and closes its menu: Escape, a press outside, and picking a page should close it; a press inside an overlay a section opens (a Select's list) should not. Every href includes the base, and the chrome's router turns a click on one into client navigation.

modo-ui ships one: `@justanarthur/modo-ui/docs#SiteSwitcher`, its Popover with the pages as a Sidebar menu.

## Plain fallbacks

The Plain components are semantic HTML with `data-modo` hooks and no visuals: `PlainButton`, `PlainLink`, `PlainCode`, `PlainSelect`, `PlainIcon`, `PlainSidebarRoot`, `PlainSidebarItem`, `PlainSidebarSection`, `PlainSiteSwitcher`. Style them through the hooks (see [theming.md](./theming.md)), or replace them by matching or pinning.

A fallback is a supported outcome. When any slot falls back, `modo dev` and `modo build` print one line naming them:

```
[modo:shell] warning: Plain fallbacks for Code, Icon, Select: no item matches by name and required props, and modo.config.ts `shell` pins none
```

A project with no items and no `shell` prints nothing. SiteSwitcher is never named: only a site with pages renders it.
