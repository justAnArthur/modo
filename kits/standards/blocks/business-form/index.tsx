/*!
 * Local addition: the form that adds or edits a business, for the side
 * pane: its name and id, the assets it owns (with Clone for a repo not
 * checked out yet), and the packs it follows, each at a version.
 * Presentational: the business, the packs, the validation messages and the
 * callbacks come in as props; `standards business set`, `business remove`
 * and `clone` run outside.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Checkbox from '@justanarthur/modo-ui/components/inputs/checkbox'
import Field from '@justanarthur/modo-ui/components/inputs/field'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import Select from '@justanarthur/modo-ui/components/inputs/select'
import AlertDialog from '@justanarthur/modo-ui/components/overlays/alert-dialog'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import SizeProvider from '@justanarthur/modo-ui/primitives/systems/sizes'
import { Download, Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { KIND_LABEL } from '../../lib/states'
import type { Asset, AssetKind, Business, Pack } from '../../lib/types'
import { PANE, PaneHeader, PaneSection as Section } from '../pane'

const KINDS = Object.keys(KIND_LABEL) as AssetKind[]

/** The id a new asset of a kind gets first. */
const KIND_ID: Partial<Record<AssetKind, string>> = { website: 'site', webapp: 'app' }

/** `Camasys GmbH` → `camasys-gmbh`. */
const slug = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function newAsset(kind: AssetKind, assets: Asset[]): Asset {
  const base = KIND_ID[kind] ?? kind
  let id = base
  for (let n = 2; assets.some(asset => asset.id === id); n++) id = `${base}-${n}`
  return { id, kind }
}

/** `website` follows the latest version, `website@1` stays on it. */
const parsePack = (entry: string) => {
  const [id, version] = entry.split('@') as [string, string?]
  return { id, version: version ? Number(version) : undefined }
}

const LATEST = 'latest'

const EMPTY: Business = { id: '', name: '', assets: [], packs: [], waivers: [] }

function AssetField({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Field invalid={Boolean(error)} className={className}>
      <Field.Label>{label}</Field.Label>
      {children}
      {error && <Field.Error>{error}</Field.Error>}
    </Field>
  )
}

interface AssetCardProps {
  asset: Asset
  errors: Record<string, string>
  onChange: (asset: Asset) => void
  onRemove: () => void
  onClone?: () => void
  cloning: boolean
}

function AssetCard({ asset, errors, onChange, onRemove, onClone, cloning }: AssetCardProps) {
  const shape = useShape()
  const set = (patch: Partial<Asset>) => onChange({ ...asset, ...patch })
  // An emptied field leaves the asset, so the YAML doesn't carry `url: ''`.
  const text = (field: 'url' | 'repo' | 'path' | 'stack') => (value: string) => set({ [field]: value || undefined })
  return (
    <li className={cn('grid grid-cols-2 gap-3 border border-border p-4', shape.container)}>
      <AssetField label="Kind">
        <Select value={asset.kind} onValueChange={kind => set({ kind: KINDS.find(k => k === kind) ?? asset.kind })}>
          <Select.Trigger variant="bordered" />
          <Select.Content>
            {KINDS.map(kind => (
              <Select.Item key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </AssetField>
      <div className="flex items-end gap-1">
        <AssetField label="Id" error={errors.id} className="min-w-0 flex-1">
          <Input variant="bordered" value={asset.id} onValueChange={id => set({ id })} className="font-mono" />
        </AssetField>
        <Button variant="ghost" size="icon-compact" aria-label={`Remove ${asset.id}`} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
      <AssetField label="URL" error={errors.url} className="col-span-2">
        <Input
          variant="bordered"
          value={asset.url ?? ''}
          onValueChange={text('url')}
          placeholder="https://example.com"
        />
      </AssetField>
      <AssetField label="GitHub repo" error={errors.repo}>
        <Input
          variant="bordered"
          value={asset.repo ?? ''}
          onValueChange={text('repo')}
          placeholder="owner/name"
          className="font-mono"
        />
      </AssetField>
      <AssetField label="Stack" error={errors.stack}>
        <Input variant="bordered" value={asset.stack ?? ''} onValueChange={text('stack')} placeholder="next" />
      </AssetField>
      <div className="col-span-2 flex items-end gap-2">
        <AssetField label="Local path" error={errors.path} className="min-w-0 flex-1">
          <Input
            variant="bordered"
            value={asset.path ?? ''}
            onValueChange={text('path')}
            placeholder={asset.repo ? `~/Projects/${asset.repo}` : '~/Projects/owner/name'}
            className="font-mono"
          />
        </AssetField>
        {asset.repo && !asset.path && (
          <Button variant="secondary" leadingIcon={Download} loading={cloning} onClick={onClone}>
            Clone
          </Button>
        )}
      </div>
    </li>
  )
}

interface BusinessFormProps {
  /** The business being edited (controlled). Pair with `onValueChange`. */
  value?: Business
  /** The business at first, for an uncontrolled form. Defaults to a new, empty one. */
  defaultValue?: Business
  /** Called with the whole business on every change. */
  onValueChange?: (business: Business) => void
  /** The packs it can follow, each with its latest version. */
  packs: Pick<Pack, 'id' | 'title' | 'version'>[]
  /** Validation messages by field, as the engine's schema reports them: `name`, `id`, `packs`, `assets.0.repo`. */
  errors?: Record<string, string>
  /** Called with an asset's id on its Clone, offered while it has a repo and no local path. */
  onClone?: (asset: string) => void
  /** The id of the asset being cloned: its Clone spins. */
  cloning?: string
  /** The pane's title. Defaults to `'New business'`. */
  title?: string
  /** Called with the business on Save. */
  onSave?: (business: Business) => void
  /** The save is under way: Save spins. Defaults to `false`. */
  saving?: boolean
  /** Called on Cancel. */
  onCancel?: () => void
  /** Called once Delete is confirmed. Without it there is no Delete: a new business has nothing to delete. */
  onDelete?: () => void
  /** Called on the close button. Without it there is none. */
  onClose?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * A business, added or edited in the side pane: what it is called, what it
 * owns, and which standards it is measured against.
 *
 * The id is the file name under `businesses/`: for a new business it
 * follows the name as a slug (`Camasys GmbH` → `camasys-gmbh`) until you
 * type one of your own. Each asset is a card: its kind and id, its URL, its
 * GitHub repo (`owner/name`), its stack and its local checkout; an asset
 * with a repo and no path offers Clone, which checks the repo out and fills
 * the path in (`cloning` spins it). Add asset appends one with an id free
 * for its kind. The packs are checkboxes, each with the version it follows:
 * the latest, or one pinned.
 *
 * Save hands the business over, its worker and waivers untouched;
 * validation happens outside, and its messages come back through `errors`,
 * each under its field. Delete asks first. Works controlled (`value` +
 * `onValueChange`) or uncontrolled (`defaultValue`).
 *
 * @example {@include ./examples.mdx}
 */
export default function BusinessForm({
  value,
  defaultValue = EMPTY,
  onValueChange,
  packs,
  errors = {},
  onClone,
  cloning,
  title = 'New business',
  onSave,
  saving = false,
  onCancel,
  onDelete,
  onClose,
  className,
}: BusinessFormProps) {
  const [business, setBusiness] = useControllableState(value, defaultValue, onValueChange)
  // A new business's id follows its name until it is typed.
  const [linked, setLinked] = useState(!business.id)
  const set = (patch: Partial<Business>) => setBusiness({ ...business, ...patch })
  const followed = new Map(business.packs.map(entry => [parsePack(entry).id, parsePack(entry).version]))
  const assetErrors = (index: number) =>
    Object.fromEntries(
      Object.entries(errors)
        .filter(([path]) => path.startsWith(`assets.${index}.`))
        .map(([path, message]) => [path.split('.')[2], message]),
    )

  const setPack = (id: string, on: boolean, version?: number) =>
    set({
      packs: on
        ? [...business.packs.filter(entry => parsePack(entry).id !== id), version ? `${id}@${version}` : id]
        : business.packs.filter(entry => parsePack(entry).id !== id),
    })

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className={cn(PANE, 'flex-1')}>
        <PaneHeader title={title} onClose={onClose} />

        <div className="grid grid-cols-2 gap-3">
          <Field invalid={Boolean(errors.name)}>
            <Field.Label>Name</Field.Label>
            <Input
              variant="bordered"
              value={business.name}
              onValueChange={name => set(linked ? { name, id: slug(name) } : { name })}
              placeholder="Camasys"
            />
            {errors.name && <Field.Error>{errors.name}</Field.Error>}
          </Field>
          <Field invalid={Boolean(errors.id)}>
            <Field.Label>Id</Field.Label>
            <Input
              variant="bordered"
              value={business.id}
              onValueChange={id => {
                setLinked(false)
                set({ id })
              }}
              placeholder="camasys"
              className="font-mono"
            />
            {errors.id ? (
              <Field.Error>{errors.id}</Field.Error>
            ) : (
              <Field.Description>businesses/{business.id || '…'}.yml</Field.Description>
            )}
          </Field>
        </div>

        <Section title="Assets" aside={business.assets.length || undefined}>
          <SizeProvider size="compact">
            {business.assets.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {business.assets.map((asset, index) => (
                  <AssetCard
                    key={index}
                    asset={asset}
                    errors={assetErrors(index)}
                    onChange={next => set({ assets: business.assets.map(a => (a === asset ? next : a)) })}
                    onRemove={() => set({ assets: business.assets.filter(a => a !== asset) })}
                    onClone={() => onClone?.(asset.id)}
                    cloning={cloning === asset.id}
                  />
                ))}
              </ul>
            )}
            <div>
              <Button
                variant="secondary"
                leadingIcon={Plus}
                onClick={() => set({ assets: [...business.assets, newAsset('website', business.assets)] })}
              >
                Add asset
              </Button>
            </div>
          </SizeProvider>
        </Section>

        <Section title="Packs" aside={followed.size || undefined}>
          <ul className="m-0 flex list-none flex-col p-0">
            {packs.map(pack => {
              const on = followed.has(pack.id)
              const pinned = followed.get(pack.id)
              return (
                <li key={pack.id} className="flex items-center gap-3 border-border border-b last:border-b-0">
                  <Checkbox
                    label={pack.title}
                    checked={on}
                    onCheckedChange={checked => setPack(pack.id, checked, pinned)}
                    className="min-w-0 flex-1"
                  />
                  <Select
                    size="compact"
                    value={pinned ? String(pinned) : LATEST}
                    onValueChange={next => setPack(pack.id, true, next === LATEST ? undefined : Number(next))}
                    disabled={!on}
                  >
                    <Select.Trigger variant="borderless" aria-label={`${pack.title}'s version`} className="w-36" />
                    <Select.Content align="end">
                      <Select.Item value={LATEST}>Latest (v{pack.version})</Select.Item>
                      {Array.from({ length: pack.version }, (_, i) => pack.version - i).map(version => (
                        <Select.Item key={version} value={String(version)}>
                          Pinned to v{version}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </li>
              )
            })}
          </ul>
          {errors.packs && <p className="text-caption weight-medium text-destructive">{errors.packs}</p>}
        </Section>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-border border-t px-5 py-3">
        {onDelete && (
          <AlertDialog>
            <AlertDialog.Trigger
              render={
                <Button variant="destructive" size="compact">
                  Delete
                </Button>
              }
            />
            <AlertDialog.Content>
              <AlertDialog.Header>
                <AlertDialog.Title>Delete {business.name || 'this business'}?</AlertDialog.Title>
                <AlertDialog.Description>
                  businesses/{business.id}.yml goes, with its assets, packs and waivers. The repos and checkouts stay.
                </AlertDialog.Description>
              </AlertDialog.Header>
              <AlertDialog.Footer>
                <AlertDialog.Close render={<Button variant="ghost">Keep</Button>} />
                <AlertDialog.Close render={<Button variant="destructive" onClick={onDelete} />}>
                  Delete
                </AlertDialog.Close>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog>
        )}
        <Button variant="ghost" size="compact" className="ml-auto" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="compact" loading={saving} onClick={() => onSave?.(business)}>
          Save
        </Button>
      </footer>
    </div>
  )
}

export type { BusinessFormProps }
export { BusinessForm }
