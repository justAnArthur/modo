/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Toast page's global `toast()`. Plain buttons that call it, so the example
 * stays hook-free and shows the calls as they would sit in app code.
 */

import { useIcon } from '../../../lib/icon-context'
import Button from '../../button'
import { toast } from './manager'

const wait = (ms: number, fail = false) =>
  new Promise<void>((resolve, reject) => setTimeout(() => (fail ? reject(new Error('Network error')) : resolve()), ms))

export default function GlobalDemo() {
  const Star = useIcon('star')

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button
        variant="secondary"
        onClick={() => toast.success({ title: 'Saved', description: 'Called from a plain handler.' })}
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.error({
            title: 'Upload failed',
            description: (
              <>
                <span className="weight-medium text-foreground">report.pdf</span> is larger than 25 MB.
              </>
            ),
            action: { label: 'Retry', onClick: () => toast.info('Retrying…') },
          })
        }
      >
        Error with action
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          const handle = toast.loading('Syncing…')
          setTimeout(() => handle.update({ type: 'success', title: 'Synced', timeout: 4000 }), 1600)
        }}
      >
        Loading, then update
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast
            .promise(wait(1600, Math.random() < 0.5), {
              loading: 'Publishing…',
              success: { title: 'Published' },
              error: (error: unknown) => ({ title: 'Could not publish', description: String(error) }),
            })
            .catch(() => {})
        }
      >
        Promise
      </Button>
      <Button variant="secondary" onClick={() => toast({ type: 'action', title: 'Starred', icon: Star })}>
        Custom icon
      </Button>
      <Button variant="ghost" onClick={() => toast.dismiss()}>
        Dismiss all
      </Button>
    </div>
  )
}
