import { describe, expect, test } from 'bun:test'
import { parsePatch } from '../components/data-display/diff'

const kinds = (patch: string) => parsePatch(patch).map(l => `${l.kind}:${l.text}`)

describe('parsePatch', () => {
  test('skips git headers', () => {
    const patch = [
      'diff --git a/a.ts b/b.ts',
      'similarity index 90%',
      'rename from a.ts',
      'rename to b.ts',
      'index 1234567..89abcde 100644',
      '--- a/a.ts',
      '+++ b/b.ts',
      '@@ -1,2 +1,2 @@',
      ' keep',
      '-old',
      '+new',
      '\\ No newline at end of file',
      'diff --git a/c.png b/c.png',
      'new file mode 100644',
      'Binary files /dev/null and b/c.png differ',
    ].join('\n')
    expect(kinds(patch)).toEqual(['hunk:@@ -1,2 +1,2 @@', 'context:keep', 'remove:old', 'add:new'])
  })

  test('keeps a removed line that starts with --', () => {
    expect(kinds('@@ -1 +1 @@\n--- a comment\n+-- a comment!')).toEqual([
      'hunk:@@ -1 +1 @@',
      'remove:-- a comment',
      'add:-- a comment!',
    ])
  })

  test('a --- / +++ pair inside hunks starts the next file', () => {
    const patch = '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-x\n+y\n--- a/z\n+++ b/z\n@@ -3 +3 @@\n-z'
    expect(parsePatch(patch).map(l => l.kind)).toEqual(['hunk', 'remove', 'add', 'hunk', 'remove'])
    expect(parsePatch(patch).at(-1)?.oldNo).toBe(3)
  })
})
