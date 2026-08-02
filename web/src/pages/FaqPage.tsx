import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { faqApi } from '../api'
import type { FaqCardInput } from '../api'
import type { FaqCard } from '../types'
import { BackLink, Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

function FaqForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
}: {
  initial?: FaqCardInput
  onSubmit: (data: FaqCardInput) => void
  onCancel: () => void
  submitLabel: string
  pending?: boolean
}) {
  const [question, setQuestion] = useState(initial?.question ?? '')
  const [answer, setAnswer] = useState(initial?.answer ?? '')
  const [source, setSource] = useState(initial?.source ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    onSubmit({ question: question.trim(), answer, source })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Fråga</span>
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="T.ex. Hur byter jag säkring?" required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Svar</span>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Källa</span>
        <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="T.ex. Sunlight husbilsmanual" />
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

function groupBySource(cards: FaqCard[]): [string, FaqCard[]][] {
  const groups = new Map<string, FaqCard[]>()
  for (const card of cards) {
    const key = card.source || 'Övrigt'
    const list = groups.get(key) ?? []
    list.push(card)
    groups.set(key, list)
  }
  return [...groups.entries()]
}

export default function FaqPage() {
  const queryClient = useQueryClient()
  const { data: cards } = useQuery({ queryKey: ['faq'], queryFn: faqApi.list })
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['faq'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: FaqCardInput) => faqApi.create(data),
    onSuccess: () => {
      invalidate()
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FaqCardInput }) => faqApi.update(id, data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => faqApi.remove(id),
    onSuccess: invalidate,
  })

  const filtered = useMemo(() => {
    if (!cards) return []
    const q = search.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((c) => c.question.toLowerCase().includes(q) || c.answer.toLowerCase().includes(q))
  }, [cards, search])

  const groups = groupBySource(filtered)

  return (
    <div>
      <BackLink />
      <PageHeader title="Bra att veta" action={!showForm && <Button onClick={() => setShowForm(true)}>+ Nytt kort</Button>} />

      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Korta svar plockade ur husbilens manualer, som en FAQ. Lägg gärna till egna kort när ni läser mer i
        Instruktionsboken.
      </p>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Sök..."
        className="mb-4"
      />

      {showForm && (
        <Card className="mb-4">
          <FaqForm
            submitLabel="Spara"
            pending={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {cards && cards.length === 0 && <EmptyState>Inga kort ännu.</EmptyState>}
      {cards && cards.length > 0 && filtered.length === 0 && <EmptyState>Inga kort matchade sökningen.</EmptyState>}

      <div className="flex flex-col gap-5">
        {groups.map(([source, sourceCards]) => (
          <div key={source}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{source}</h2>
            <div className="flex flex-col gap-2">
              {sourceCards.map((card) => (
                <Card key={card.id}>
                  {editingId === card.id ? (
                    <FaqForm
                      initial={{ question: card.question, answer: card.answer, source: card.source }}
                      submitLabel="Uppdatera"
                      pending={updateMutation.isPending}
                      onSubmit={(data) => updateMutation.mutate({ id: card.id, data })}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{card.question}</p>
                      {card.answer && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{card.answer}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button variant="secondary" onClick={() => setEditingId(card.id)}>
                          Redigera
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (confirm('Ta bort kortet?')) removeMutation.mutate(card.id)
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
        ))}
      </div>
    </div>
  )
}
