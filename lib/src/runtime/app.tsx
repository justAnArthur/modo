import { Router } from './router'
import { Shell } from './shell/layout'

export function App() {
  return (
    <Shell>
      <Router />
    </Shell>
  )
}
