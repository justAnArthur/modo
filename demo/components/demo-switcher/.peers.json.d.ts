// Type shim for the runtime-generated ./.peers.json (written by
// scripts/run-design-systems.ts before the dev servers start or the site builds).
// `group` is the section a peer lists under: "Design systems" or "Kits".
declare const peers: { name: string; url: string; group: string }[]
export default peers
