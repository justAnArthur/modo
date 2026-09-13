import type { ReactNode } from 'react'
import './code.css'

export default function Code({ children, language, className }: { children?: ReactNode; language?: string; className?: string }) {
  const cls = ['shell-code', className].filter(Boolean).join(' ')
  return (
    <pre data-aui="shell-code" data-language={language} className={cls}>
      <code>{children}</code>
    </pre>
  )
}
