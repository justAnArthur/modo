/** A virtual module that only imports stylesheets, in order. */
export function cssModule(files: string[]): string {
  return files.map(f => `import ${JSON.stringify(f)};`).join('\n')
}
