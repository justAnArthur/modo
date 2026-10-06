// Type shim for the runtime-generated ./.peers.json (written by
// scripts/run-design-systems.ts before the dev servers start or the site builds).
declare const peers: { name: string; url: string }[]
export default peers
