export type Location = 'hemma' | 'husbil'

export interface Ingredient {
  id: string
  name: string
  amount: number
  unit: string
}

export interface Recipe {
  id: string
  name: string
  servings: number
  instructions: string
  ingredients: Ingredient[]
  createdAt: number
  updatedAt: number
}

export interface InventoryItem {
  id: string
  location: Location
  name: string
  amount: number
  unit: string
  updatedAt: number
}

export interface RecipeSelection {
  recipeId: string
  portions: number
}

export interface Trip {
  id: string
  name: string
  recipeSelections: RecipeSelection[]
  extraItems: Ingredient[]
  createdAt: number
  updatedAt: number
}

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export type ChecklistKind = 'packlista' | 'rutin'

export interface Checklist {
  id: string
  kind: ChecklistKind
  name: string
  items: ChecklistItem[]
  createdAt: number
  updatedAt: number
}

export interface LogEntry {
  id: string
  date: string
  mileage: number | null
  note: string
  imageUrl: string | null
  createdAt: number
  updatedAt: number
}
