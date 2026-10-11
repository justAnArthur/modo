import type { ButtonHTMLAttributes } from 'react'
import Base from 'typed-ds/components/button'

type SubmitProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** The form to submit. */
  form?: string
}

/**
 * {@inheritDoc Base}
 *
 * Submits a form.
 */
const Submit = (props: SubmitProps) => <Base type="submit" {...props} />

export default Submit
