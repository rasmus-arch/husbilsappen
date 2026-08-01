import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { checklistsApi } from '../api'
import type { ChecklistItem } from '../types'
import { Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

let tempIdCounter = 0
function tempId() {
  tempIdCounter += 1
  return `temp-${tempIdCounter}`
}

export default function ListDetailPage() {
  const { listId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newItem, setNewItem] = useState('')

  const { data: list } = useQuery({
    queryKey: ['checklist', listId],
    queryFn: () => checklistsApi.get(listId!),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['checklist', listId] })
    queryClient.invalidateQueries({ queryKey: ['checklists'] })
  }

  const updateMutation = useMutation({
    mutationFn: (patch: { name?: string; items?: ChecklistItem[] }) => checklistsApi.update(listId!, patch),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: () => checklistsApi.remove(listId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
      navigate('/listor')
    },
  })

  if (!list) return <p className="text-slate-500">Laddar…</p>

  function toggleItem(itemId: string) {
    const items = list!.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i))
    updateMutation.mutate({ items })
  }

  function addItem() {
    if (!newItem.trim()) return
    const items = [...list!.items, { id: tempId(), text: newItem.trim(), checked: false }]
    updateMutation.mutate({ items })
    setNewItem('')
  }

  function removeItem(itemId: string) {
    const items = list!.items.filter((i) => i.id !== itemId)
    updateMutation.mutate({ items })
  }

  function resetAll() {
    const items = list!.items.map((i) => ({ ...i, checked: false }))
    updateMutation.mutate({ items })
  }

  function removeList() {
    if (!confirm(`Ta bort listan "${list!.name}"?`)) return
    removeMutation.mutate()
  }

  return (
    <div>
      <PageHeader title={list.kind === 'packlista' ? 'Packlista' : 'Checklista'} />

      <label className="mb-4 flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Namn</span>
        <Input defaultValue={list.name} onBlur={(e) => updateMutation.mutate({ name: e.target.value })} />
      </label>

      <Card className="mb-4">
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Ny rad"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <Button onClick={addItem}>Lägg till</Button>
        </div>
      </Card>

      {list.items.length === 0 && <EmptyState>Inga rader ännu.</EmptyState>}

      <div className="mb-4 flex flex-col gap-2">
        {list.items.map((item) => (
          <Card key={item.id} className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item.id)}
              className="h-4 w-4 accent-teal-700"
            />
            <span
              className={`flex-1 text-sm ${
                item.checked ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {item.text}
            </span>
            <Button variant="ghost" onClick={() => removeItem(item.id)}>
              ✕
            </Button>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={resetAll}>
          Återställ bockar
        </Button>
        <Button variant="danger" onClick={removeList}>
          Ta bort lista
        </Button>
      </div>
    </div>
  )
}
