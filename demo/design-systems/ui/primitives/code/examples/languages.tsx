import Code from '..'

<div className="flex w-full flex-col gap-3">
  <Code language="css">{`.card {
  background: var(--surface-3);
  border-radius: 12px;
}`}</Code>
  <Code language="sh">{`bun add sugar-high # one dependency`}</Code>
  <Code language="text">{`Plain text keeps its own line breaks.`}</Code>
</div>
