import Code from '..'

<Code>{`import { Button } from '@/components/button'

// Every token type has its own color.
export function Save({ busy }: { busy: boolean }) {
  return <Button loading={busy}>Save changes</Button>
}`}</Code>
