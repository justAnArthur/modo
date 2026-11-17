/*!
 * Mock: a desktop with the island and a strip of scenes to pick under it,
 * the frame of the docs' app-screen pages. Nothing here ships in the barrel.
 */

'use client'

import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import type { ReactNode } from 'react'
import { MockDesktop } from './desktop'

export interface Scene {
  value: string
  label: string
}

interface SceneDeskProps {
  /** The scenes to pick from. */
  scenes: Scene[]
  /** The scene shown. */
  value: string
  /** Called with the scene picked. */
  onValueChange: (value: string) => void
  /** The island, hung from the desktop's top edge. */
  island: ReactNode
  /** The desktop's height in px. Defaults to `520`. */
  height?: number
  /** The app named first in the menu bar. */
  app?: string
  /** Show the scenes under the screen. Defaults to `true`. */
  picker?: boolean
}

/** A desktop with the island, and the scenes as subtle tabs under it; the strip scrolls sideways when it runs out of room. */
export function SceneDesk({ scenes, value, onValueChange, island, height = 520, app, picker = true }: SceneDeskProps) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-4">
      <MockDesktop height={height} app={app} island={island} />
      {picker && (
        <div className="scroll-fade-x w-full overflow-x-auto scrollbar-hide">
          <Tabs variant="subtle" value={value} onValueChange={onValueChange} className="mx-auto w-max">
            <Tabs.List>
              {scenes.map(scene => (
                <Tabs.Item key={scene.value} value={scene.value} label={scene.label} />
              ))}
            </Tabs.List>
          </Tabs>
        </div>
      )}
    </div>
  )
}
