/*!
 * Local addition (not part of Fluid Functionalism): the placeholder page
 * SidebarApp shows in its main area when it gets no children, so the shell
 * reads as an app in its examples: the selected thread's title, its section
 * and status, and a few updates.
 */

import Badge from '../../components/badge'
import Card from '../../components/card'
import type { NavItem } from './nav-data'

const STATUS = {
  active: { label: 'Active', color: 'green' },
  unread: { label: 'Unread', color: 'blue' },
  idle: { label: 'Idle', color: 'gray' },
} as const

const UPDATES = [
  { author: 'Jane Doe', text: 'Pushed a first pass to the preview branch.', when: '2h ago' },
  { author: 'Alex Kim', text: 'Left two comments on the spacing between the cards.', when: '4h ago' },
  { author: 'Sam Rivera', text: 'Marked the token review as ready to merge.', when: 'Yesterday' },
]

interface ThreadPageProps {
  section: string
  thread: NavItem
}

export function ThreadPage({ section, thread }: ThreadPageProps) {
  const status = STATUS[thread.status]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-title weight-semibold text-foreground">{thread.label}</h1>
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted-foreground">{section}</span>
          <Badge variant="dot" color={status.color} size="compact">
            {status.label}
          </Badge>
        </div>
      </div>
      <Card.Group orientation="inline" border="outlined">
        {UPDATES.map(update => (
          <Card key={update.author}>
            <Card.Header>
              <Card.Title>{update.author}</Card.Title>
              <Card.Description>{update.text}</Card.Description>
            </Card.Header>
            <Card.Footer>
              <span className="text-caption text-muted-foreground">{update.when}</span>
            </Card.Footer>
          </Card>
        ))}
      </Card.Group>
    </div>
  )
}
