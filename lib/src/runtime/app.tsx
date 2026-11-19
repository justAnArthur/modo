import { useExampleParam } from './location'
import { Router } from './router'
import { Shell } from './shell/layout'
import { useSiteId } from './site/routes'

export function App() {
  const example = useExampleParam()
  const siteId = useSiteId()
  // A full-screen example and the site view fill the viewport, without the chrome.
  if (example !== null || siteId !== undefined) return <Router />
  return (
    <Shell>
      <Router />
    </Shell>
  )
}
