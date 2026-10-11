/*
 * Local addition (not part of Fluid Functionalism): `inert` that holds on
 * React 18 and 19. React 18 has no `inert` prop and passes it through as an
 * unknown attribute, so it needs a string (`''`); React 19 reads it as a
 * boolean prop and drops `''`. `inertProps` picks the value per React major;
 * `markInert` sets the attribute from a ref, outside React, for an element
 * that is always inert.
 */

import { version } from 'react'

const INERT = (Number.parseInt(version, 10) >= 19 ? true : '') as unknown as boolean

/** Spread onto an element to make it inert while `on`. */
export function inertProps(on: boolean) {
  return on ? { inert: INERT } : {}
}

/** A ref callback that makes its element inert for good. */
export function markInert(el: HTMLElement | null) {
  el?.setAttribute('inert', '')
}
