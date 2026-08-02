import type { InventoryItem, Recipe, Trip } from '../types'

export interface AggregatedIngredient {
  key: string
  name: string
  unit: string
  amount: number
}

export interface ShoppingPlan {
  needed: AggregatedIngredient[]
  fromHusbil: AggregatedIngredient[]
  fromHome: AggregatedIngredient[]
  toBuy: AggregatedIngredient[]
}

export function normKey(name: string, unit: string): string {
  return `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}`
}

function emptyPlan(): ShoppingPlan {
  return { needed: [], fromHusbil: [], fromHome: [], toBuy: [] }
}

export function aggregateNeededIngredients(trip: Trip, recipes: Recipe[]): AggregatedIngredient[] {
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const totals = new Map<string, AggregatedIngredient>()

  for (const sel of trip.recipeSelections ?? []) {
    const recipe = byId.get(sel.recipeId)
    if (!recipe || sel.portions <= 0) continue
    const scale = recipe.servings > 0 ? sel.portions / recipe.servings : sel.portions
    for (const ing of recipe.ingredients) {
      if (!ing.name.trim()) continue
      const key = normKey(ing.name, ing.unit)
      const existing = totals.get(key)
      const amount = ing.amount * scale
      if (existing) {
        existing.amount += amount
      } else {
        totals.set(key, { key, name: ing.name.trim(), unit: ing.unit.trim(), amount })
      }
    }
  }

  for (const item of trip.extraItems ?? []) {
    if (!item.name.trim()) continue
    const key = normKey(item.name, item.unit)
    const existing = totals.get(key)
    if (existing) {
      existing.amount += item.amount
    } else {
      totals.set(key, { key, name: item.name.trim(), unit: item.unit.trim(), amount: item.amount })
    }
  }

  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, 'sv'))
}

function inventoryTotals(items: InventoryItem[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const item of items) {
    const key = normKey(item.name, item.unit)
    totals.set(key, (totals.get(key) ?? 0) + item.amount)
  }
  return totals
}

export function computeShoppingPlan(trip: Trip, recipes: Recipe[], inventory: InventoryItem[]): ShoppingPlan {
  const needed = aggregateNeededIngredients(trip, recipes)
  if (needed.length === 0) return emptyPlan()

  const husbilTotals = inventoryTotals(inventory.filter((i) => i.location === 'husbil'))
  const homeTotals = inventoryTotals(inventory.filter((i) => i.location === 'hemma'))

  const fromHusbil: AggregatedIngredient[] = []
  const fromHome: AggregatedIngredient[] = []
  const toBuy: AggregatedIngredient[] = []

  const round = (n: number) => Math.round(n * 100) / 100

  for (const item of needed) {
    const husbilQty = husbilTotals.get(item.key) ?? 0
    const usedFromHusbil = Math.min(item.amount, husbilQty)
    const afterHusbil = item.amount - usedFromHusbil
    if (usedFromHusbil > 0) {
      fromHusbil.push({ ...item, amount: round(usedFromHusbil) })
    }

    if (afterHusbil <= 0) continue

    const homeQty = homeTotals.get(item.key) ?? 0
    const usedFromHome = Math.min(afterHusbil, homeQty)
    const afterHome = afterHusbil - usedFromHome
    if (usedFromHome > 0) {
      fromHome.push({ ...item, amount: round(usedFromHome) })
    }

    if (afterHome > 0) {
      toBuy.push({ ...item, amount: round(afterHome) })
    }
  }

  return { needed, fromHusbil, fromHome, toBuy }
}

export function findUnassignedInventory(inventory: InventoryItem[], recipes: Recipe[]): InventoryItem[] {
  const usedKeys = new Set<string>()
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      if (!ing.name.trim()) continue
      usedKeys.add(normKey(ing.name, ing.unit))
    }
  }
  return inventory.filter((item) => !usedKeys.has(normKey(item.name, item.unit)))
}
