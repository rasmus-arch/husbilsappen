import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { recipesApi } from '../api'
import type { Ingredient, Recipe } from '../types'
import { Button, Input, PageHeader } from '../components/ui'

function emptyRecipe(): Recipe {
  const now = Date.now()
  return {
    id: '',
    name: '',
    servings: 4,
    instructions: '',
    ingredients: [],
    createdAt: now,
    updatedAt: now,
  }
}

let tempIdCounter = 0
function tempId() {
  tempIdCounter += 1
  return `temp-${tempIdCounter}`
}

export default function RecipeEditPage() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !recipeId

  const { data: existing, isLoading } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => recipesApi.get(recipeId!),
    enabled: !isNew,
  })

  const [recipe, setRecipe] = useState<Recipe>(emptyRecipe)

  useEffect(() => {
    if (existing) setRecipe(existing)
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { name: recipe.name, servings: recipe.servings, instructions: recipe.instructions, ingredients: recipe.ingredients }
      return isNew ? recipesApi.create(payload) : recipesApi.update(recipeId!, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      if (!isNew) queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
      navigate('/recept')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => recipesApi.remove(recipeId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      navigate('/recept')
    },
  })

  function updateIngredient(id: string, patch: Partial<Ingredient>) {
    setRecipe((r) => ({
      ...r,
      ingredients: r.ingredients.map((ing) => (ing.id === id ? { ...ing, ...patch } : ing)),
    }))
  }

  function addIngredient() {
    setRecipe((r) => ({
      ...r,
      ingredients: [...r.ingredients, { id: tempId(), name: '', amount: 1, unit: 'st' }],
    }))
  }

  function removeIngredient(id: string) {
    setRecipe((r) => ({ ...r, ingredients: r.ingredients.filter((ing) => ing.id !== id) }))
  }

  function remove() {
    if (!confirm(`Ta bort receptet "${recipe.name}"?`)) return
    deleteMutation.mutate()
  }

  if (!isNew && isLoading) return <p className="text-slate-500">Laddar…</p>

  return (
    <div>
      <PageHeader title={isNew ? 'Nytt recept' : 'Redigera recept'} />

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Namn</span>
          <Input value={recipe.name} onChange={(e) => setRecipe((r) => ({ ...r, name: e.target.value }))} placeholder="T.ex. Pasta carbonara" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Antal portioner</span>
          <Input
            type="number"
            min={1}
            value={recipe.servings}
            onChange={(e) => setRecipe((r) => ({ ...r, servings: Number(e.target.value) || 1 }))}
            className="max-w-24"
          />
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ingredienser</span>
            <Button variant="secondary" onClick={addIngredient} type="button">
              + Lägg till
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className="flex gap-2">
                <Input
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, { name: e.target.value })}
                  placeholder="Vara"
                  className="min-w-0 flex-[2]"
                />
                <Input
                  type="number"
                  value={ing.amount}
                  onChange={(e) => updateIngredient(ing.id, { amount: Number(e.target.value) || 0 })}
                  placeholder="Mängd"
                  className="min-w-0 flex-1"
                />
                <Input
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, { unit: e.target.value })}
                  placeholder="Enhet"
                  className="min-w-0 flex-1"
                />
                <Button variant="ghost" type="button" onClick={() => removeIngredient(ing.id)} className="shrink-0">
                  ✕
                </Button>
              </div>
            ))}
            {recipe.ingredients.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Inga ingredienser tillagda.</p>
            )}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tillagning</span>
          <textarea
            value={recipe.instructions}
            onChange={(e) => setRecipe((r) => ({ ...r, instructions: e.target.value }))}
            rows={6}
            placeholder="Beskriv hur man lagar rätten..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>

        {saveMutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">{(saveMutation.error as Error).message}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Spara
          </Button>
          {!isNew && (
            <Button variant="danger" onClick={remove} type="button">
              Ta bort
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
