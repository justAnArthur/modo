import Button, { type ButtonProps } from 'base-ds/components/button'

interface FancyButtonProps extends Omit<ButtonProps, 'loading'> {
  /** Adds a glow around the button. */
  glow?: boolean
}

/**
 * {@inheritDoc base-ds/components/button}
 *
 * The fancy one glows.
 *
 * @example {@include ./examples.mdx}
 */
export default function FancyButton({ glow = false, ...props }: FancyButtonProps) {
  return <Button data-glow={glow} {...props} />
}
