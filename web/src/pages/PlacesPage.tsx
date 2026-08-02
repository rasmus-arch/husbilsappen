import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { placesApi } from '../api'
import type { PlaceInput } from '../api'
import { BackLink, Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

function Stars({ rating, onChange }: { rating: number | null; onChange?: (rating: number) => void }) {
  return (
    <span className="text-amber-500">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={onChange ? () => onChange(n) : undefined}
          className={onChange ? 'cursor-pointer' : ''}
        >
          {rating !== null && n <= rating ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

function PlaceForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
}: {
  initial?: PlaceInput
  onSubmit: (data: PlaceInput) => void
  onCancel: () => void
  submitLabel: string
  pending?: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description, rating, notes })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Namn</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="T.ex. Böda Sand" required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Beskrivning/plats</span>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ort, adress eller läge" />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Betyg</span>
        <Stars rating={rating} onChange={setRating} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Anteckningar</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Wifi, pris, faciliteter..."
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

export default function PlacesPage() {
  const queryClient = useQueryClient()
  const { data: places } = useQuery({ queryKey: ['places'], queryFn: placesApi.list })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['places'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: PlaceInput) => placesApi.create(data),
    onSuccess: () => {
      invalidate()
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlaceInput }) => placesApi.update(id, data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => placesApi.remove(id),
    onSuccess: invalidate,
  })

  return (
    <div>
      <BackLink />
      <PageHeader title="Platser" action={!showForm && <Button onClick={() => setShowForm(true)}>+ Ny plats</Button>} />

      {showForm && (
        <Card className="mb-4">
          <PlaceForm
            submitLabel="Spara"
            pending={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {places && places.length === 0 && <EmptyState>Inga sparade platser ännu.</EmptyState>}

      <div className="flex flex-col gap-3">
        {places?.map((place) => (
          <Card key={place.id}>
            {editingId === place.id ? (
              <PlaceForm
                initial={{ name: place.name, description: place.description, rating: place.rating, notes: place.notes }}
                submitLabel="Uppdatera"
                pending={updateMutation.isPending}
                onSubmit={(data) => updateMutation.mutate({ id: place.id, data })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{place.name}</span>
                  <Stars rating={place.rating} />
                </div>
                {place.description && <p className="text-sm text-slate-500 dark:text-slate-400">{place.description}</p>}
                {place.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{place.notes}</p>}
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => setEditingId(place.id)}>
                    Redigera
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Ta bort "${place.name}"?`)) removeMutation.mutate(place.id)
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
