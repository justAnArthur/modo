/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Input page's password reveal, an Input with an InputAction that toggles
 * its type, so the example stays hook-free.
 */

import { useState } from 'react'
import { useIcon } from '../../../lib/icon-context'
import Input, { InputAction, type InputProps } from './index'

export default function PasswordDemo(props: InputProps) {
  const [shown, setShown] = useState(false)
  const Eye = useIcon('eye')
  const EyeOff = useIcon('eye-off')

  return (
    <Input
      {...props}
      type={shown ? 'text' : 'password'}
      endAdornment={
        <InputAction
          label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          icon={shown ? EyeOff : Eye}
          onClick={() => setShown(!shown)}
        />
      }
    />
  )
}
