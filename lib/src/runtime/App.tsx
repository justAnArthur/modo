import { Router, useExampleParam } from './router'
import { Shell } from './shell/renderer'

export function App() {
  // A full-screen example fills the viewport, without the chrome.
  if (useExampleParam() !== null) return <Router />
  return (
    <Shell>
      <Router />
    </Shell>
  )
}
