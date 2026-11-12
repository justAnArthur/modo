# Security policy

## Supported versions

Fixes land on the latest release of each package: `@justanarthur/modo` and `@justanarthur/modo-ui`, 1.x once 1.0.0 is out. Older lines get no backports.

## Reporting a vulnerability

Please don't open a public issue for a vulnerability.

Report it privately through GitHub: on [the repository](https://github.com/justAnArthur/modo), open **Security → Report a vulnerability** ([direct link](https://github.com/justAnArthur/modo/security/advisories/new)). Include the package and version, what an attacker can do, and the steps or a minimal project that reproduces it.

modo has a single maintainer, who aims to answer within a week. Once a fix is released, the advisory is published with credit to you, unless you'd rather stay anonymous.

## Scope

modo is a build tool: `modo dev` runs a local dev server and executes the design system's own code (its items, `modo.config.ts` and the `vite` extension). Code you choose to run that way is not a vulnerability in modo; a way for something else (a page, a dependency of the lib, a crafted item file) to escape that, or a flaw in what `modo build` ships to visitors, is.
