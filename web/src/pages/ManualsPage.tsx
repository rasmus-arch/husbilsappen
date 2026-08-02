import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { manualsApi } from '../api'
import type { ManualInput } from '../api'
import { BackLink, Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

function fileIcon(fileType: string) {
  return fileType === 'application/pdf' ? '📄' : '🖼️'
}

function ManualForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  requireFile,
}: {
  initial?: { title: string; category: string; notes: string }
  onSubmit: (data: ManualInput) => void
  onCancel: () => void
  submitLabel: string
  pending?: boolean
  requireFile: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [file, setFile] = useState<File | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (requireFile && !file) return
    onSubmit({ title: title.trim(), category, notes, file })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Titel</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="T.ex. Truma värmare - manual" required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Kategori</span>
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="T.ex. Värme, Kylskåp, El" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {requireFile ? 'Fil (PDF eller bild)' : 'Ny fil (valfritt, ersätter befintlig)'}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-slate-600 dark:text-slate-400"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Anteckningar</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Avbryt
        </Button>
      </div>
    </form>
  )
}

export default function ManualsPage() {
  const queryClient = useQueryClient()
  const { data: manuals } = useQuery({ queryKey: ['manuals'], queryFn: manualsApi.list })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['manuals'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: ManualInput) => manualsApi.create(data),
    onSuccess: () => {
      invalidate()
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ManualInput }) => manualsApi.update(id, data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => manualsApi.remove(id),
    onSuccess: invalidate,
  })

  return (
    <div>
      <BackLink />
      <PageHeader title="Instruktionsbok" action={!showForm && <Button onClick={() => setShowForm(true)}>+ Nytt dokument</Button>} />

      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Spara manualer, säkringsschema och andra viktiga dokument (PDF eller foto) för snabb åtkomst.
      </p>

      {showForm && (
        <Card className="mb-4">
          <ManualForm
            submitLabel="Spara"
            pending={createMutation.isPending}
            requireFile
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {manuals && manuals.length === 0 && <EmptyState>Inga dokument sparade ännu.</EmptyState>}

      <div className="flex flex-col gap-2">
        {manuals?.map((manual) => (
          <Card key={manual.id}>
            {editingId === manual.id ? (
              <ManualForm
                initial={{ title: manual.title, category: manual.category, notes: manual.notes }}
                submitLabel="Uppdatera"
                pending={updateMutation.isPending}
                requireFile={false}
                onSubmit={(data) => updateMutation.mutate({ id: manual.id, data })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start gap-3">
                <a href={manual.fileUrl} target="_blank" rel="noreferrer" className="text-2xl">
                  {fileIcon(manual.fileType)}
                </a>
                <div className="min-w-0 flex-1">
                  <a
                    href={manual.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                  >
                    {manual.title}
                  </a>
                  {manual.category && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {manual.category}
                    </span>
                  )}
                  {manual.notes && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{manual.notes}</p>}
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" onClick={() => setEditingId(manual.id)}>
                      Redigera
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Ta bort "${manual.title}"?`)) removeMutation.mutate(manual.id)
                      }}
                    >
                      Ta bort
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
