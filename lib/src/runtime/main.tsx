// The cascade, in order: chrome structure, the host's css, tokens, item css,
// shell component css. The chrome's own files load here, never from a
// component: imported later, they would beat the host's restyling at equal
// specificity.
import './shell/css/contract.css'
import './shell/css/layout.css'
import './shell/css/page.css'
import './shell/css/overview.css'
import './shell/css/canvas.css'
import './shell/css/examples.css'
import './shell/css/tokens.css'
import 'virtual:modo-config-css'
import 'virtual:modo-tokens-css'
import 'virtual:modo-items-css'
import 'virtual:modo-shell-css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { installHostColors } from './tokens/host-colors'

// Host tokens may hold bare channels (`--border: 286 0.4% 92%`); resolve the
// chrome colors once, before anything renders.
installHostColors()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('modo: missing #root in index.html')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
