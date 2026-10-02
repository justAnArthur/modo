import { useEffect, useState } from 'react'
import { shell } from 'virtual:modo-shell'

export function CopyButton({ text }: { text: string }) {
  const { Button, Icon } = shell
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = () =>
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      (err: unknown) => console.warn('[modo] copy failed:', err),
    )

  const label = copied ? 'Copied' : 'Copy code'
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} onClick={copy}>
      <Icon name={copied ? 'check' : 'copy'} label={label} />
    </Button>
  )
}

/** The shell's Code with a hover-revealed copy button in its corner. */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const { Code } = shell
  return (
    <div data-modo="code-block">
      <Code language={language}>{code}</Code>
      <div data-modo="code-actions">
        <CopyButton text={code} />
      </div>
    </div>
  )
}
