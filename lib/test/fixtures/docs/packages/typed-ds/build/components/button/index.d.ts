import type { ButtonHTMLAttributes, ForwardRefExoticComponent, RefAttributes } from 'react'

export interface TypedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Size step. Defaults to `'md'`. */
  size?: 'sm' | 'md'
}

/**
 * A button known only from its typings.
 *
 * @example {@include ./examples.mdx}
 */
declare const TypedButton: ForwardRefExoticComponent<TypedButtonProps & RefAttributes<HTMLButtonElement>>
export default TypedButton
