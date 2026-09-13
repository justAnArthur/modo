import type { ReactNode } from 'react'
import './panel.css'

export default function Panel({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div data-aui="shell-panel" className={className}>
      {children}
    </div>
  )
}
