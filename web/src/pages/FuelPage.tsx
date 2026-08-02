import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { fuelApi } from '../api'
import type { FuelEntryInput } from '../api'
import { BackLink, Button, Card, EmptyState, Input, PageHeader } from '../components/ui'
import { formatDate } from '../lib/date'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function FuelForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
}: {
  initial?: FuelEntryInput
  onSubmit: (data: FuelEntryInput) => void
  onCancel: () => void
  submitLabel: string
  pending?: boolean
}) {
  const [date, setDate] = useState(initial?.date ?? today())
  const [mileage, setMileage] = useState(initial?.mileage != null ? String(initial.mileage) : '')
  const [liters, setLiters] = useState(initial?.liters != null ? String(initial.liters) : '')
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (mileage === '' || liters === '') return
    onSubmit({ date, mileage: Number(mileage), liters: Number(liters), cost: cost === '' ? null : Number(cost) })
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
          <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="km" required />
        </label>
      </div>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Antal liter</span>
          <Input type="number" value={liters} onChange={(e) => setLiters(e.target.value)} required />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Kostnad (kr)</span>
          <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="valfritt" />
        </label>
      </div>
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

export default function FuelPage() {
  const queryClient = useQueryClient()
  const { data: entries } = useQuery({ queryKey: ['fuel'], queryFn: fuelApi.list })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['fuel'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: FuelEntryInput) => fuelApi.create(data),
    onSuccess: () => {
      invalidate()
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FuelEntryInput }) => fuelApi.update(id, data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => fuelApi.remove(id),
    onSuccess: invalidate,
  })

  let avgPer100Km: number | null = null
  if (entries && entries.length >= 2) {
    const sorted = [...entries].sort((a, b) => a.mileage - b.mileage)
    const totalLiters = sorted.slice(1).reduce((sum, e) => sum + e.liters, 0)
    const distance = sorted[sorted.length - 1].mileage - sorted[0].mileage
    if (distance > 0) avgPer100Km = Math.round((totalLiters / distance) * 100 * 10) / 10
  }

  return (
    <div>
      <BackLink />
      <PageHeader title="Bränslelogg" action={!showForm && <Button onClick={() => setShowForm(true)}>+ Ny tankning</Button>} />

      {avgPer100Km !== null && (
        <Card className="mb-4 text-center">
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{avgPer100Km} l/100 km</span>
          <p className="text-xs text-slate-500 dark:text-slate-400">Snittförbrukning</p>
        </Card>
      )}

      {showForm && (
        <Card className="mb-4">
          <FuelForm
            submitLabel="Spara"
            pending={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {entries && entries.length === 0 && <EmptyState>Inga tankningar registrerade ännu.</EmptyState>}

      <div className="flex flex-col gap-2">
        {entries?.map((entry) => (
          <Card key={entry.id}>
            {editingId === entry.id ? (
              <FuelForm
                initial={{ date: entry.date, mileage: entry.mileage, liters: entry.liters, cost: entry.cost }}
                submitLabel="Uppdatera"
                pending={updateMutation.isPending}
                onSubmit={(data) => updateMutation.mutate({ id: entry.id, data })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-900 dark:text-slate-100">
                    {entry.liters} liter · {entry.mileage} km
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(entry.date)}
                    {entry.cost !== null ? ` · ${entry.cost} kr` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" onClick={() => setEditingId(entry.id)}>
                    ✎
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Ta bort tankningen?')) removeMutation.mutate(entry.id)
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
