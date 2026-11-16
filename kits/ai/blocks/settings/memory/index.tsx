/*!
 * Local addition: the settings screen's memory section — the auto memory
 * switch, then MEMORY.md and each memory file, opening into its contents.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import Switch from '@justanarthur/modo-ui/components/inputs/switch'
import { CardCode, Details, Footer, Group, Row, Section, Toggles } from '../../../lib/settings-parts'
import type { MemoryFile } from '../../../lib/types'

function frontmatter(memory: MemoryFile) {
  return `---\nname: ${memory.name}\ndescription: ${memory.description}\ntype: ${memory.type}\n---`
}

interface MemoryProps {
  /** The profile's memory files, without the MEMORY.md index (it is built from them). */
  files: MemoryFile[]
  /** The config dir being edited: memory lives in its `memory` folder. */
  configDir: string
  /** Whether sessions save memories on their own at first. Defaults to `true`. */
  autoMemory?: boolean
  /** Called when the auto memory switch flips. */
  onAutoMemoryChange?: (enabled: boolean) => void
  /** File names (`MEMORY.md`, or a file's `name`) whose rows start open. Defaults to `[]`. */
  defaultOpen?: string[]
  /** Called with the file's name (`MEMORY.md` for the index) when an open file's Edit is pressed. */
  onEdit?: (name: string) => void
  /** Called when an open file's Forget is pressed. */
  onForget?: (file: MemoryFile) => void
}

/**
 * What a profile remembers across sessions, one fact per file.
 *
 * A switch on top says whether sessions save and update memories as they
 * learn. Below it, MEMORY.md (the index loaded into every session, with its
 * entry count) and then each file with its description and type. Press a row
 * and it lifts into a card with the file's contents and where it lives; a
 * memory file can be edited or forgotten there.
 *
 * @example {@include ./examples.mdx}
 */
export default function Memory({
  files,
  configDir,
  autoMemory = true,
  onAutoMemoryChange,
  defaultOpen,
  onEdit,
  onForget,
}: MemoryProps) {
  const index = files.map(m => `- [${m.name}](${m.name}.md) — ${m.description}`).join('\n')
  const dir = `${configDir}/memory`
  return (
    <Section
      title="Memory"
      lead="What this profile remembers across sessions, one fact per file. MEMORY.md is the index loaded into every session."
    >
      <Toggles label="Memory">
        <Switch
          label="Auto memory"
          description="Let sessions save and update memories as they learn"
          defaultChecked={autoMemory}
          onCheckedChange={onAutoMemoryChange}
        />
      </Toggles>
      <Group title="Files" aside={<span className="tabular-nums">{files.length + 1}</span>}>
        <Details label="Memory files" defaultOpen={defaultOpen}>
          <Row
            value="MEMORY.md"
            index={0}
            label="MEMORY.md"
            caption="The index, loaded into every session"
            meta={<span className="text-caption tabular-nums">{files.length} entries</span>}
          >
            <CardCode language="md">{index}</CardCode>
            <Footer source={dir}>
              <Button size="compact" variant="ghost" onClick={() => onEdit?.('MEMORY.md')}>
                Edit
              </Button>
            </Footer>
          </Row>
          {files.map((memory, i) => (
            <Row
              key={memory.name}
              value={memory.name}
              index={i + 1}
              label={`${memory.name}.md`}
              caption={memory.description}
              meta={<span className="text-caption">{memory.type}</span>}
            >
              <CardCode language="md">{frontmatter(memory)}</CardCode>
              <Footer source={dir}>
                <Button size="compact" variant="ghost" onClick={() => onEdit?.(memory.name)}>
                  Edit
                </Button>
                <Button size="compact" variant="ghost" onClick={() => onForget?.(memory)}>
                  Forget
                </Button>
              </Footer>
            </Row>
          ))}
        </Details>
      </Group>
    </Section>
  )
}

export type { MemoryProps }

export { Memory }
