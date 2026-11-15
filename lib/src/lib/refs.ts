/** Whether a `logo` names a component module (`./x.tsx`, `./x.tsx#Logo`) rather than an image file. */
export function isComponentRef(ref: string): boolean {
  return /\.[cm]?[jt]sx?(?:#.*)?$/.test(ref)
}

/** `./x.tsx#Name` → its file and the export it names; `default` when it names none. */
export function splitRef(ref: string): { path: string; exportName: string } {
  const [path = ref, exportName = 'default'] = ref.split('#')
  return { path, exportName }
}
