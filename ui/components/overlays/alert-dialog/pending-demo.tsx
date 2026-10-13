/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * AlertDialog page's controlled `pending`. A fake mutation (`mutate` +
 * `isPending`, the shape TanStack Query hands out) drives the confirm, so
 * the example stays hook-free.
 */

import { useState } from 'react'
import Button from '../../button'
import AlertDialog from './index'

export default function PendingDemo() {
  const [isPending, setPending] = useState(false)
  const mutate = () => {
    setPending(true)
    setTimeout(() => setPending(false), 1600)
  }

  return (
    <AlertDialog>
      <AlertDialog.Trigger render={<Button variant="secondary">Revoke access</Button>} />
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Revoke this key?</AlertDialog.Title>
          <AlertDialog.Description>Apps using it stop working at once.</AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action variant="destructive" pending={isPending} onClick={() => mutate()}>
            Revoke
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  )
}
