import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { serviceApi } from '../api'
import type { ServiceEntryInput } from '../api'
import { BackLink, Button, Card, EmptyState, Input, PageHeader } from '../components/ui'
import { formatDate } from '../lib/date'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function ServiceForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
}: {
  initial?: { date: string; title: string; mileage: number | null; cost: number | null; notes: string }
  onSubmit: (data: ServiceEntryInput) => void
  onCancel: () => void
  submitLabel: string
  pending?: boolean
}) {
  const [date, setDate] = useState(initial?.date ?? today())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [mileage, setMileage] = useState(initial?.mileage != null ? String(initial.mileage) : '')
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [receipt, setReceipt] = useState<File | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      date,
      title: title.trim(),
      mileage: mileage === '' ? null : Number(mileage),
      cost: cost === '' ? null : Number(cost),
      notes,
      receipt,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Datum</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="flex w-32 flex-col gap-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Mätarställning</span>
          <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="km" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Vad gjordes</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="T.ex. Oljebyte" required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Kostnad (kr)</span>
        <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="valfritt" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Kvitto/foto</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
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

export default function ServicePage() {
  const queryClient = useQueryClient()
  const { data: entries } = useQuery({ queryKey: ['service'], queryFn: serviceApi.list })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['service'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: ServiceEntryInput) => serviceApi.create(data),
    onSuccess: () => {
      invalidate()
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServiceEntryInput }) => serviceApi.update(id, data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => serviceApi.remove(id),
    onSuccess: invalidate,
  })

  return (
    <div>
      <BackLink />
      <PageHeader title="Servicelogg" action={!showForm && <Button onClick={() => setShowForm(true)}>+ Ny post</Button>} />

      {showForm && (
        <Card className="mb-4">
          <ServiceForm
            submitLabel="Spara"
            pending={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {entries && entries.length === 0 && <EmptyState>Ingen serviceanteckning ännu.</EmptyState>}

      <div className="flex flex-col gap-3">
        {entries?.map((entry) => (
          <Card key={entry.id}>
            {editingId === entry.id ? (
              <ServiceForm
                initial={{ date: entry.date, title: entry.title, mileage: entry.mileage, cost: entry.cost, notes: entry.notes }}
                submitLabel="Uppdatera"
                pending={updateMutation.isPending}
                onSubmit={(data) => updateMutation.mutate({ id: entry.id, data })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{entry.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(entry.date)}</span>
                </div>
                <div className="mb-1 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {entry.mileage !== null && <span>{entry.mileage} km</span>}
                  {entry.cost !== null && <span>{entry.cost} kr</span>}
                </div>
                {entry.notes && <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{entry.notes}</p>}
                {entry.receiptUrl && (
                  <a
                    href={entry.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-teal-700 dark:text-teal-400"
                  >
                    📎 Visa kvitto
                  </a>
                )}
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => setEditingId(entry.id)}>
                    Redigera
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm('Ta bort serviceposten?')) removeMutation.mutate(entry.id)
                    }}
                  >
                    Ta bort
                  </Button>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
