/*
 * Local addition (not part of Fluid Functionalism): one ref callback that
 * writes every ref it is given.
 */

'use client'

import { type MutableRefObject, type Ref, type RefCallback, useMemo } from 'react'

/** One ref callback that writes the node to each ref: callbacks are called, objects get `.current`. */
function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return node => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as MutableRefObject<T | null>).current = node
    }
  }
}

/**
 * `mergeRefs`, stable while the refs are. Use it when one of the refs holds
 * state (a `useMorph` `popupRef`): a fresh callback on every render detaches
 * and reattaches the node, which such a ref reads as an unmount.
 */
function useMergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return useMemo(() => mergeRefs(...refs), refs)
}

export { mergeRefs, useMergeRefs }
