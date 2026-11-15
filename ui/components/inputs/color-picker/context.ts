/*
 * Local addition (not part of Fluid Functionalism): what ColorPicker.Popover
 * tells the panel inside it.
 */

'use client'

import { createContext } from 'react'

/** False inside ColorPicker.Popover, whose morph layers paint the panel's surface. */
export const PanelSurfaceContext = createContext(true)
