// Import types throughout virtual/: a relative import declaration isn't allowed in an
// ambient module and, under skipLibCheck, silently types as any.

// biome-ignore lint/suspicious/noExplicitAny: a host component's props are whatever its design system declares
type ModoHostComponent = import('react').ComponentType<any>

/** The chrome's icon names, plus any `socials` key. */
// biome-ignore lint/complexity/noBannedTypes: `string & {}` keeps the literal names in autocomplete
type ModoIconName = 'code' | 'copy' | 'check' | 'link' | 'external' | 'menu' | 'sun' | 'moon' | (string & {})
