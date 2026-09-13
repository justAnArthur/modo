import { Router } from './router'
import { Shell } from './shell/renderer'

export function App() {
  return (
    <Shell>
      <Router />
    </Shell>
  )
}
