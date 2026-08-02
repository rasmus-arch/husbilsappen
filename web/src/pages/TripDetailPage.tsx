import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { inventoryApi, recipesApi, tripsApi } from '../api'
import type { RecipeSelection } from '../types'
import { computeShoppingPlan } from '../lib/shoppingCalc'
import { Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

let tempIdCounter = 0
function tempId() {
  tempIdCounter += 1
  return `temp-${tempIdCounter}`
}

function ShoppingSection({
  title,
  hint,
  items,
}: {
  title: string
  hint: string
  items: { key: string; name: string; unit: string; amount: number }[]
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <h3 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      <Card>
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.key} className="flex justify-between py-1.5 text-sm">
              <span className="text-slate-900 dark:text-slate-100">{item.name}</span>
              <span className="text-slate-500 dark:text-slate-400">
                {item.amount} {item.unit}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export default function TripDetailPage() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: trip } = useQuery({ queryKey: ['trip', tripId], queryFn: () => tripsApi.get(tripId!) })
  const { data: recipes } = useQuery({ queryKey: ['recipes'], queryFn: recipesApi.list })
  const { data: inventory } = useQuery({ queryKey: ['inventory', 'alla'], queryFn: () => inventoryApi.list() })

  function invalidateTrip() {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trips'] })
  }

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Pick<NonNullable<typeof trip>, 'name' | 'recipeSelections' | 'extraItems'>>) =>
      tripsApi.update(tripId!, patch),
    onSuccess: invalidateTrip,
  })

  const [extraName, setExtraName] = useState('')
  const [extraAmount, setExtraAmount] = useState(1)
  const [extraUnit, setExtraUnit] = useState('st')

  const removeMutation = useMutation({
    mutationFn: () => tripsApi.remove(tripId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      navigate('/')
    },
  })

  const unpackMutation = useMutation({
    mutationFn: (items: { name: string; unit: string; amount: number }[]) =>
      inventoryApi.move(items, 'husbil', 'hemma'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  })

  if (!trip || !recipes || !inventory) return <p className="text-slate-500">Laddar…</p>

  // Skydd mot ett ofullständigt/gammalt svar från API:t (t.ex. under en
  // pågående deploy) så sidan visar tomma listor istället för att krascha.
  const recipeSelections = trip.recipeSelections ?? []
  const extraItems = trip.extraItems ?? []

  const selectionByRecipe = new Map(recipeSelections.map((s) => [s.recipeId, s]))

  function toggleRecipe(recipeId: string, servings: number) {
    const exists = selectionByRecipe.has(recipeId)
    const next: RecipeSelection[] = exists
      ? recipeSelections.filter((s) => s.recipeId !== recipeId)
      : [...recipeSelections, { recipeId, portions: servings }]
    updateMutation.mutate({ recipeSelections: next })
  }

  function setPortions(recipeId: string, portions: number) {
    const next = recipeSelections.map((s) => (s.recipeId === recipeId ? { ...s, portions } : s))
    updateMutation.mutate({ recipeSelections: next })
  }

  function removeTrip() {
    if (!confirm(`Ta bort resan "${trip!.name}"?`)) return
    removeMutation.mutate()
  }

  function addExtraItem() {
    if (!extraName.trim()) return
    const next = [
      ...extraItems,
      { id: tempId(), name: extraName.trim(), amount: extraAmount, unit: extraUnit.trim() || 'st' },
    ]
    updateMutation.mutate({ extraItems: next })
    setExtraName('')
    setExtraAmount(1)
    setExtraUnit('st')
  }

  function removeExtraItem(id: string) {
    const next = extraItems.filter((i) => i.id !== id)
    updateMutation.mutate({ extraItems: next })
  }

  const plan = computeShoppingPlan(trip, recipes, inventory)

  return (
    <div>
      <PageHeader title="Resa" />

      <label className="mb-4 flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Namn</span>
        <Input defaultValue={trip.name} onBlur={(e) => updateMutation.mutate({ name: e.target.value })} />
      </label>

      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Recept för resan</h3>
        {recipes.length === 0 ? (
          <EmptyState>Inga recept skapade ännu. Lägg till recept under fliken Recept.</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {recipes.map((recipe) => {
              const selection = selectionByRecipe.get(recipe.id)
              const checked = !!selection
              return (
                <Card key={recipe.id} className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRecipe(recipe.id, recipe.servings)}
                    className="h-4 w-4 accent-teal-700"
                  />
                  <span className="flex-1 text-sm text-slate-900 dark:text-slate-100">{recipe.name || 'Namnlöst recept'}</span>
                  {checked && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={selection.portions}
                        onChange={(e) => setPortions(recipe.id, Number(e.target.value) || 0)}
                        className="w-16"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">port.</span>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Övriga varor (utan recept)</h3>
        <Card className="mb-2">
          <div className="flex flex-wrap gap-2">
            <Input
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
              placeholder="Vara, t.ex. Toalettpapper"
              className="min-w-32 flex-1"
            />
            <Input
              type="number"
              value={extraAmount}
              onChange={(e) => setExtraAmount(Number(e.target.value) || 0)}
              className="w-20"
            />
            <Input value={extraUnit} onChange={(e) => setExtraUnit(e.target.value)} placeholder="Enhet" className="w-20" />
            <Button onClick={addExtraItem} type="button">
              Lägg till
            </Button>
          </div>
        </Card>
        {extraItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {extraItems.map((item) => (
              <Card key={item.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex-1 text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {item.amount} {item.unit}
                </span>
                <Button variant="ghost" onClick={() => removeExtraItem(item.id)}>
                  ✕
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Inköpsplan</h3>
        {plan.needed.length === 0 ? (
          <EmptyState>Välj recept ovan för att räkna ut vad som behöver flyttas och handlas.</EmptyState>
        ) : (
          <>
            <ShoppingSection title="✅ Redan i husbilen" hint="Finns redan ombord, inget att göra." items={plan.fromHusbil} />
            <ShoppingSection title="📦 Flytta hemifrån" hint="Finns hemma – ta med till husbilen." items={plan.fromHome} />
            <ShoppingSection title="🛒 Handla" hint="Finns varken hemma eller i husbilen." items={plan.toBuy} />
          </>
        )}
      </div>

      {plan.fromHome.length > 0 && (
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => {
              if (!confirm('Flyttar det som packades till husbilen för resan tillbaka till hemma-skafferiet. Fortsätt?')) return
              unpackMutation.mutate(plan.fromHome.map((i) => ({ name: i.name, unit: i.unit, amount: i.amount })))
            }}
            disabled={unpackMutation.isPending}
          >
            📦 Packa upp resan
          </Button>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Flyttar tillbaka det som togs till husbilen för resan till hemma-skafferiet.
          </p>
          {unpackMutation.isSuccess && <p className="mt-1 text-xs text-teal-700 dark:text-teal-400">Klart!</p>}
        </div>
      )}

      <Button variant="danger" onClick={removeTrip}>
        Ta bort resa
      </Button>
    </div>
  )
}
