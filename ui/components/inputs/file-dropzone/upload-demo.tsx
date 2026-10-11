/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * FileDropzone page. It keeps the picked files, plays a pretend upload for
 * each and shows the rejections in a Field's error, so the example stays
 * hook-free. The zone itself keeps no files.
 */

import { useEffect, useState } from 'react'
import Field from '../field'
import FileDropzone, { type FileDropzoneProps, type FileRejection } from './index'

interface Upload {
  file: File
  progress: number
}

const REASONS = { type: "isn't a PDF or an image", size: 'is over 5 MB', count: "doesn't fit: three files at most" }

export default function UploadDemo(props: FileDropzoneProps) {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [rejected, setRejected] = useState<FileRejection[]>([])

  // A pretend upload: every file gains a little each tick until it is done.
  const busy = uploads.some(upload => upload.progress < 100)
  useEffect(() => {
    if (!busy) return
    const timer = setInterval(
      () => setUploads(list => list.map(upload => ({ ...upload, progress: Math.min(upload.progress + 12, 100) }))),
      300,
    )
    return () => clearInterval(timer)
  }, [busy])

  const left = 3 - uploads.length

  return (
    <Field invalid={rejected.length > 0} className="w-96 max-w-full gap-2">
      <Field.Label>Attachments</Field.Label>
      <FileDropzone
        {...props}
        maxFiles={left}
        disabled={left <= 0}
        onFilesChange={files => {
          setRejected([])
          setUploads(list => [...list, ...files.map(file => ({ file, progress: 0 }))])
        }}
        onFilesRejected={setRejected}
      />
      <Field.Error>
        {rejected.length > 0 && rejected.map(({ file, reason }) => `${file.name} ${REASONS[reason]}.`).join(' ')}
      </Field.Error>
      {uploads.length > 0 && (
        <div className="flex flex-col">
          {uploads.map(upload => (
            <FileDropzone.Row
              key={`${upload.file.name}-${upload.file.lastModified}`}
              file={upload.file}
              status={upload.progress < 100 ? 'uploading' : 'done'}
              progress={upload.progress}
              onRemove={() => setUploads(list => list.filter(item => item !== upload))}
            />
          ))}
        </div>
      )}
    </Field>
  )
}
