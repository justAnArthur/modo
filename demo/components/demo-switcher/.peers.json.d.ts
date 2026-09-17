// Type shim for the runtime-generated ./.peers.json (written by
// scripts/run-design-systems.ts before the dev servers start).
declare const peers: { name: string; url: string }[]
export default peers
