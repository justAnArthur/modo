import type { ReactNode } from 'react'

/** Badge — a short label. */
export default function Badge({ children }: { /** The label. */ children?: ReactNode }) {
  return <span data-badge="">{children}</span>
}
