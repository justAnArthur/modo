import { defineConfig } from '@justanarthur/modo/config'

export default defineConfig({
  name: 'modo demo',
  description: 'the reference impl. tokens → primitives → components → blocks.',
  // explicit shell mapping — demonstrates the resolver's first tier.
  // the Panel slot would otherwise fall through to the user's components/ panel
  // by interface match; pinning it here proves the explicit path is honored.
  shell: {
    Panel: './components/panel',
  },
  css: './global.css',
})
