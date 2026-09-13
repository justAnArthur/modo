import './shell/shell.css'
import 'virtual:modo-config'
import 'virtual:modo-tokens-css'
import { tokens } from 'virtual:modo-tokens'
import { items, byId, components, examples } from 'virtual:modo-items'
import 'virtual:modo-items-css'
import { shell } from 'virtual:modo-shell'
import 'virtual:modo-shell-css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

// Touch the imports to satisfy bundler tree-shaking.
void tokens
void items
void byId
void components
void examples
void shell

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('modo-atomic-ui: missing #root in index.html')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
