import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checklistsApi } from '../api'
import type { ChecklistKind } from '../types'
import { Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

const tabs: { kind: ChecklistKind; label: string }[] = [
  { kind: 'packlista', label: 'Packlistor' },
  { kind: 'rutin', label: 'Checklistor' },
]

export default function ListsPage() {
  const [kind, setKind] = useState<ChecklistKind>('packlista')
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: lists } = useQuery({
    queryKey: ['checklists', kind],
    queryFn: () => checklistsApi.list(kind),
  })

  const createMutation = useMutation({
    mutationFn: () => checklistsApi.create(kind, name.trim()),
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
      setName('')
      navigate(`/listor/${list.id}`)
    },
  })

  function createList() {
    if (!name.trim()) return
    createMutation.mutate()
  }

  return (
    <div>
      <PageHeader title="Listor" />

      <div className="mb-4 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.kind}
            onClick={() => setKind(tab.kind)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              kind === tab.kind
                ? 'bg-teal-700 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {kind === 'packlista'
          ? 'Packlistor för det du ska ta med på resan.'
          : 'Återanvändbara checklistor, t.ex. inför avfärd, parkering eller natten.'}
      </p>

      <Card className="mb-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === 'packlista' ? 'Namn på packlista' : 'Namn på checklista'}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && createList()}
          />
          <Button onClick={createList} disabled={createMutation.isPending}>
            Skapa
          </Button>
        </div>
      </Card>

      {lists && lists.length === 0 && <EmptyState>Inga listor ännu.</EmptyState>}

      <div className="flex flex-col gap-2">
        {lists?.map((list) => {
          const checkedCount = list.items.filter((i) => i.checked).length
          return (
            <Link key={list.id} to={`/listor/${list.id}`}>
              <Card className="hover:border-teal-600">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{list.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {checkedCount}/{list.items.length}
                  </span>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
