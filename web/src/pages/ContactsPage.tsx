import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { contactsApi } from '../api'
import type { EmergencyContactInput } from '../api'
import { BackLink, Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

function ContactForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
}: {
  initial?: EmergencyContactInput
  onSubmit: (data: EmergencyContactInput) => void
  onCancel: () => void
  submitLabel: string
  pending?: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), phone, category, notes })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Namn</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="T.ex. Vägassistans" required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Telefon</span>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="020-912912" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Kategori</span>
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="T.ex. Bilhjälp, Försäkring, Familj" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Anteckningar</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
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

export default function ContactsPage() {
  const queryClient = useQueryClient()
  const { data: contacts } = useQuery({ queryKey: ['contacts'], queryFn: contactsApi.list })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['contacts'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: EmergencyContactInput) => contactsApi.create(data),
    onSuccess: () => {
      invalidate()
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmergencyContactInput }) => contactsApi.update(id, data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => contactsApi.remove(id),
    onSuccess: invalidate,
  })

  return (
    <div>
      <BackLink />
      <PageHeader title="Nödkontakter" action={!showForm && <Button onClick={() => setShowForm(true)}>+ Ny kontakt</Button>} />

      {showForm && (
        <Card className="mb-4">
          <ContactForm
            submitLabel="Spara"
            pending={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {contacts && contacts.length === 0 && <EmptyState>Inga kontakter sparade ännu.</EmptyState>}

      <div className="flex flex-col gap-2">
        {contacts?.map((contact) => (
          <Card key={contact.id}>
            {editingId === contact.id ? (
              <ContactForm
                initial={{ name: contact.name, phone: contact.phone, category: contact.category, notes: contact.notes }}
                submitLabel="Uppdatera"
                pending={updateMutation.isPending}
                onSubmit={(data) => updateMutation.mutate({ id: contact.id, data })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{contact.name}</span>
                    {contact.category && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {contact.category}
                      </span>
                    )}
                  </div>
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="text-sm text-teal-700 dark:text-teal-400">
                      {contact.phone}
                    </a>
                  )}
                  {contact.notes && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{contact.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" onClick={() => setEditingId(contact.id)}>
                    ✎
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Ta bort "${contact.name}"?`)) removeMutation.mutate(contact.id)
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
