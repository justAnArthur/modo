/**
 * A URL pathname as routes and slugs spell it: decoded (`/n%C3%A1vody` → `/návody`)
 * and NFC, the form page slugs take. A malformed escape leaves it as is.
 */
export function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname).normalize('NFC')
  } catch {
    return pathname
  }
}
