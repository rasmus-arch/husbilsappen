import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { inventoryApi, recipesApi } from '../api'
import type { Location } from '../types'
import { findUnassignedInventory } from '../lib/shoppingCalc'
import { Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

type Tab = Location | 'unassigned'

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
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

function UnassignedTab() {
  const { data: inventory } = useQuery({ queryKey: ['inventory', 'alla'], queryFn: () => inventoryApi.list() })
  const { data: recipes } = useQuery({ queryKey: ['recipes'], queryFn: recipesApi.list })

  if (!inventory || !recipes) return <p className="text-slate-500">Laddar…</p>

  const unassigned = findUnassignedInventory(inventory, recipes)

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Den mängd du har hemma eller i husbilen som är mer än vad dina recept behöver.
      </p>
      {unassigned.length === 0 ? (
        <EmptyState>Allt du har täcks av dina recepts behov.</EmptyState>
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {unassigned.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-slate-900 dark:text-slate-100">{item.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.amount} {item.unit}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {item.location === 'hemma' ? 'Hemma' : 'Husbil'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('hemma')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState(1)
  const [unit, setUnit] = useState('st')
  const queryClient = useQueryClient()

  const location = tab === 'unassigned' ? undefined : tab

  const { data: items } = useQuery({
    queryKey: ['inventory', tab],
    queryFn: () => inventoryApi.list(location),
    enabled: tab !== 'unassigned',
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }

  const addMutation = useMutation({
    mutationFn: () => inventoryApi.create({ location: location!, name: name.trim(), amount, unit: unit.trim() || 'st' }),
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
        <TabButton active={tab === 'hemma'} onClick={() => setTab('hemma')} label="Hemma" />
        <TabButton active={tab === 'husbil'} onClick={() => setTab('husbil')} label="Husbil" />
        <TabButton active={tab === 'unassigned'} onClick={() => setTab('unassigned')} label="Ej i recept" />
      </div>

      {tab === 'unassigned' ? (
        <UnassignedTab />
      ) : (
        <>
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

          {items && items.length === 0 && (
            <EmptyState>Inga varor registrerade {tab === 'hemma' ? 'hemma' : 'i husbilen'} ännu.</EmptyState>
          )}

          <div className="flex flex-col gap-2">
            {items?.map((item) => (
              <Card key={item.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex-1 text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
                <Input
                  key={item.updatedAt}
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
        </>
      )}
    </div>
  )
}
