// the right-side panel for the docs site. the lib imports the default
// export from `modo.panel` (resolved via the vite alias) and renders
// it inside <aside data-aui="panel">. replace this with whatever you
// want — a theme switcher, a settings panel, a search box, anything.

export default function Panel() {
  return <h2 data-aui="panel-title">make them yours</h2>
}
