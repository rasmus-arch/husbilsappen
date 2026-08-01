import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { logbookApi } from '../api'
import type { LogEntryInput } from '../api'
import { Button, Card, EmptyState, PageHeader } from '../components/ui'
import LogEntryForm from '../components/LogEntryForm'
import { formatDate } from '../lib/date'

export default function LogbookPage() {
  const queryClient = useQueryClient()
  const { data: entries } = useQuery({ queryKey: ['logbook'], queryFn: logbookApi.list })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['logbook'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: LogEntryInput) => logbookApi.create(data),
    onSuccess: () => {
      invalidate()
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LogEntryInput }) => logbookApi.update(id, data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => logbookApi.remove(id),
    onSuccess: invalidate,
  })

  function removeEntry(id: string) {
    if (!confirm('Ta bort loggposten?')) return
    removeMutation.mutate(id)
  }

  return (
    <div>
      <PageHeader
        title="Loggbok"
        action={!showForm && <Button onClick={() => setShowForm(true)}>+ Nytt inlägg</Button>}
      />

      {showForm && (
        <Card className="mb-4">
          <LogEntryForm
            submitLabel="Spara"
            pending={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {entries && entries.length === 0 && <EmptyState>Inga loggposter ännu. Skriv ditt första inlägg!</EmptyState>}

      <div className="flex flex-col gap-3">
        {entries?.map((entry) => (
          <Card key={entry.id}>
            {editingId === entry.id ? (
              <LogEntryForm
                initial={{ date: entry.date, mileage: entry.mileage, note: entry.note }}
                submitLabel="Uppdatera"
                pending={updateMutation.isPending}
                onSubmit={(data) => updateMutation.mutate({ id: entry.id, data })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                {entry.imageUrl && (
                  <img src={entry.imageUrl} alt="" className="mb-3 w-full rounded-lg object-cover" />
                )}
                <div className="mb-1 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <span>{formatDate(entry.date)}</span>
                  {entry.mileage !== null && <span>{entry.mileage} mil</span>}
                </div>
                {entry.note && (
                  <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{entry.note}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => setEditingId(entry.id)}>
                    Redigera
                  </Button>
                  <Button variant="danger" onClick={() => removeEntry(entry.id)}>
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
