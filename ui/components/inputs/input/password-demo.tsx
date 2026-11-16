/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Input page's password reveal. An Input with an InputAction that flips its
 * type, so the example stays hook-free.
 */

'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import Input, { InputAction, type InputProps } from './index'

export default function PasswordDemo(props: InputProps) {
  const [shown, setShown] = useState(false)

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
