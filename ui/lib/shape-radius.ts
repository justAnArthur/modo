/*
 * Local addition (not part of Fluid Functionalism): the claim ShapeProvider
 * puts on `--shape-input-radius`, kept out of the provider so it is plain
 * data and testable without a DOM.
 */

/** The slice of `<html>` the claims need. */
export interface ShapeRadiusRoot {
  style: Pick<CSSStyleDeclaration, 'setProperty' | 'getPropertyValue' | 'removeProperty'>
}

/** One provider's hold on the property. */
export interface ShapeRadiusClaim {
  /** The provider's shape changed: publish the new radius, if this claim is the one on top. */
  update(radius: string): void
  /** The provider unmounted: the next claim down applies, or, with none left, the value `<html>` had before the first. */
  release(): void
}

const PROPERTY = '--shape-input-radius'

interface Stack {
  /** What `<html>` held before the first claim; empty means modo's default, from the CSS fallback. */
  before: string
  claims: { radius: string }[]
}

const stacks = new WeakMap<ShapeRadiusRoot, Stack>()

function apply(root: ShapeRadiusRoot, stack: Stack) {
  const top = stack.claims[stack.claims.length - 1]
  if (top) root.style.setProperty(PROPERTY, top.radius)
  else if (stack.before) root.style.setProperty(PROPERTY, stack.before)
  else root.style.removeProperty(PROPERTY)
}

/**
 * Publishes a ShapeProvider's element radius as `--shape-input-radius` on `root`
 * (`<html>`, so portalled content sees it). Claims stack in the order the providers'
 * effects ran: the last one is what shows, and when it unmounts the one below applies
 * again, so nothing a provider wrote outlives it.
 */
export function claimShapeRadius(root: ShapeRadiusRoot, radius: string): ShapeRadiusClaim {
  let stack = stacks.get(root)
  if (!stack) {
    stack = { before: root.style.getPropertyValue(PROPERTY), claims: [] }
    stacks.set(root, stack)
  }
  const held = stack
  const claim = { radius }
  held.claims.push(claim)
  apply(root, held)

  return {
    update(next) {
      claim.radius = next
      apply(root, held)
    },
    release() {
      const at = held.claims.indexOf(claim)
      if (at === -1) return
      held.claims.splice(at, 1)
      apply(root, held)
      if (held.claims.length === 0) stacks.delete(root)
    },
  }
}
