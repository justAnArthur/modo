import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

// Fallbacks for the slots a host doesn't fill: semantic tags and data-modo hooks, no visuals.

export function PlainButton({ type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} {...rest} />
}

export function PlainLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />
}

export function PlainCode({ children, ...rest }: HTMLAttributes<HTMLPreElement>) {
  return (
    <pre {...rest}>
      <code>{children}</code>
    </pre>
  )
}

export function PlainSelect({
  onChange,
  options,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select onChange={e => onChange(e.target.value)} {...rest}>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Hosts without an Icon slot get the label as text. */
export function PlainIcon({ label }: { name: string; label: string }) {
  return <span data-modo="icon-label">{label}</span>
}

export function PlainSidebarRoot({ children }: { children?: ReactNode }) {
  return <nav data-modo="sidebar-nav">{children}</nav>
}

export function PlainSidebarItem({ href, active, children }: { href: string; active?: boolean; children?: ReactNode }) {
  return (
    <a data-modo="sidebar-item" href={href} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
  )
}

export function PlainSidebarSection({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div data-modo="sidebar-section">
      <h3 data-modo="sidebar-section-title">{title}</h3>
      <div data-modo="sidebar-section-items">{children}</div>
    </div>
  )
}
