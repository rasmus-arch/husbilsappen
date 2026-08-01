import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { inventoryApi } from '../api'
import type { Location } from '../types'
import { Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

function LocationTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
        active
          ? 'bg-teal-700 text-white'
          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {label}
    </button>
  )
}

export default function InventoryPage() {
  const [location, setLocation] = useState<Location>('hemma')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState(1)
  const [unit, setUnit] = useState('st')
  const queryClient = useQueryClient()

  const { data: items } = useQuery({
    queryKey: ['inventory', location],
    queryFn: () => inventoryApi.list(location),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }

  const addMutation = useMutation({
    mutationFn: () => inventoryApi.create({ location, name: name.trim(), amount, unit: unit.trim() || 'st' }),
    onSuccess: () => {
      invalidate()
      setName('')
      setAmount(1)
      setUnit('st')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => inventoryApi.update(id, { amount }),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.remove(id),
    onSuccess: invalidate,
  })

  function addItem() {
    if (!name.trim()) return
    addMutation.mutate()
  }

  return (
    <div>
      <PageHeader title="Skafferi" />

      <div className="mb-4 flex gap-2">
        <LocationTab active={location === 'hemma'} onClick={() => setLocation('hemma')} label="Hemma" />
        <LocationTab active={location === 'husbil'} onClick={() => setLocation('husbil')} label="Husbil" />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vara" className="min-w-32 flex-1" />
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="w-20"
          />
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Enhet" className="w-20" />
          <Button onClick={addItem} type="button" disabled={addMutation.isPending}>
            Lägg till
          </Button>
        </div>
      </Card>

      {items && items.length === 0 && <EmptyState>Inga varor registrerade {location === 'hemma' ? 'hemma' : 'i husbilen'} ännu.</EmptyState>}

      <div className="flex flex-col gap-2">
        {items?.map((item) => (
          <Card key={item.id} className="flex items-center justify-between gap-2 py-2">
            <span className="flex-1 text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
            <Input
              type="number"
              defaultValue={item.amount}
              onBlur={(e) => updateMutation.mutate({ id: item.id, amount: Number(e.target.value) || 0 })}
              className="w-20"
            />
            <span className="w-12 text-sm text-slate-500 dark:text-slate-400">{item.unit}</span>
            <Button variant="ghost" onClick={() => removeMutation.mutate(item.id)}>
              ✕
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
