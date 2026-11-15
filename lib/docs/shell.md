# Shell inheritance

The docs chrome renders with your components. It has six slots. For each, modo looks for one of your items that fits; a slot with no fit uses a plain HTML fallback. So a design system with a Button, Link and Sidebar gets a docs site built from them, with no config.

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
| Select | `components/` | `Select` | `value`, `onChange`, `options` | `<select>` |
| Sidebar | `components/` | `Sidebar` | `children` | `<nav>` |

The name is the default export's function or const name, not the folder name. Props come from the parsed TSDoc type (see [items.md](./items.md#props)), so `children` must be visible there: a props type imported from another file hides it.

A pin wins even over a matching item. A pin that doesn't load (missing file, failed build, no such export) prints a `[modo:shell] warning:` and the slot falls through to matching.

## Pinning slots

A `shell` value is a path relative to the project root: a file, or a folder with an `index.tsx`. Add `#Name` for a named export. Several pins into one file share one build entry, so you can keep all docs-only adapters in one `modo.components.tsx`.

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

The chrome's icon buttons: copy code, show code, theme toggle, menu, canvas zoom.

```tsx
<Button variant="ghost" size="icon-sm" aria-label="Show code" aria-pressed={open} onClick={toggle}>
  <Icon name="code" label="Code" />
</Button>
```

It gets `variant="ghost"`, `size="icon-sm"`, `aria-label`, `onClick`, and `aria-pressed` on toggles. The child is an `Icon` or a short text glyph.

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
| `sun`, `moon` | The theme toggle (with [`theme`](./config.md#theme)). |
| a [`socials`](./config.md#socials) key | `github`, `npm`, or whatever key you used. |

`label` is the accessible text. Draw the label for a name you have no glyph for; the fallback `PlainIcon` always draws the label.

```tsx
// demo/design-systems/shadcn/_shell/icon.tsx, trimmed
import { Check, CodeXml, Copy, Link2, type LucideIcon, Menu, Moon, Sun } from 'lucide-react'

const icons: Record<string, LucideIcon> = { code: CodeXml, copy: Copy, check: Check, link: Link2, menu: Menu, sun: Sun, moon: Moon }

export default function Icon({ name, label }: { name: string; label: string }) {
  const Glyph = icons[name]
  return Glyph ? <Glyph size={16} strokeWidth={1.5} aria-hidden /> : <>{label}</>
}
```

### Select

The chrome itself doesn't render a Select. It is handed to [panel items](./config.md#panel) through their `shell` prop, for switchers and similar controls.

```tsx
<shell.Select value={current} onChange={(value: string) => go(value)} options={[{ value: 'a', label: 'A' }]} />
```

It gets `value`, `onChange(value: string)` (the value, not an event) and `options: { value: string; label: string }[]`.

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

## Plain fallbacks

The Plain components are semantic HTML with `data-modo` hooks and no visuals: `PlainButton`, `PlainLink`, `PlainCode`, `PlainSelect`, `PlainIcon`, `PlainSidebarRoot`, `PlainSidebarItem`, `PlainSidebarSection`. Style them through the hooks (see [theming.md](./theming.md)), or replace them by matching or pinning.

A fallback is a supported outcome. When any slot falls back, `modo dev` and `modo build` print one line naming them:

```
[modo:shell] warning: Plain fallbacks for Code, Icon, Select: no item matches by name and required props, and modo.config.ts `shell` pins none
```

A project with no items and no `shell` prints nothing.
