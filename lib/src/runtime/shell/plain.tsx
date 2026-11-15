import type {
  ButtonSlotProps,
  CodeSlotProps,
  IconSlotProps,
  LinkSlotProps,
  SelectSlotProps,
  SidebarItemProps,
  SidebarSectionProps,
  SidebarSlotProps,
} from '../../lib/contract'

// Fallbacks for the slots a host doesn't fill: semantic tags and data-modo hooks, no visuals.

export function PlainButton({ variant: _variant, size: _size, ...rest }: ButtonSlotProps) {
  return <button type="button" {...rest} />
}

export function PlainLink(props: LinkSlotProps) {
  return <a {...props} />
}

export function PlainCode({ children }: CodeSlotProps) {
  return (
    <pre>
      <code>{children}</code>
    </pre>
  )
}

export function PlainSelect({ value, onValueChange, options }: SelectSlotProps) {
  return (
    <select value={value} onChange={e => onValueChange(e.target.value)}>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Hosts without an Icon slot get the label as text. */
export function PlainIcon({ label }: IconSlotProps) {
  return <span data-modo="icon-label">{label}</span>
}

export function PlainSidebarRoot({ children }: SidebarSlotProps) {
  return <nav data-modo="sidebar-nav">{children}</nav>
}

export function PlainSidebarItem({ href, active, children }: SidebarItemProps) {
  return (
    <a data-modo="sidebar-item" href={href} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
  )
}

export function PlainSidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div data-modo="sidebar-section">
      <h3 data-modo="sidebar-section-title">{title}</h3>
      <div data-modo="sidebar-section-items">{children}</div>
    </div>
  )
}
