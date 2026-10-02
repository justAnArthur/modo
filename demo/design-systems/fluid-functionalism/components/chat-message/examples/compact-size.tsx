import ChatMessage from '..'

<div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 380, maxWidth: '100%' }}>
  <ChatMessage from="user" size="compact">Compact bubble</ChatMessage>
  <ChatMessage from="assistant" size="compact">A smaller sibling of the same hierarchy, not a squeezed copy.</ChatMessage>
</div>
