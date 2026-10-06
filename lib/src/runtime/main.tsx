// The cascade, in order: chrome structure, the host's css, tokens, item css,
// shell component css.
import './shell/shell.css'
import 'virtual:modo-config-css'
import 'virtual:modo-tokens-css'
import 'virtual:modo-items-css'
import 'virtual:modo-shell-css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
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
