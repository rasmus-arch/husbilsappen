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

export interface VehicleData {
  lengthM: number | null
  widthM: number | null
  heightM: number | null
  totalWeightKg: number | null
  curbWeightKg: number | null
  registrationNumber: string
  waterTankL: number | null
  wasteWaterTankL: number | null
  wheelbaseM: number | null
  notes: string
  updatedAt: number | null
}

export interface ServiceEntry {
  id: string
  date: string
  title: string
  mileage: number | null
  cost: number | null
  notes: string
  receiptUrl: string | null
  createdAt: number
  updatedAt: number
}

export interface Manual {
  id: string
  title: string
  category: string
  fileUrl: string
  fileType: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface Place {
  id: string
  name: string
  description: string
  rating: number | null
  notes: string
  createdAt: number
  updatedAt: number
}

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  category: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface FuelEntry {
  id: string
  date: string
  mileage: number
  liters: number
  cost: number | null
  createdAt: number
  updatedAt: number
}

export interface FaqCard {
  id: string
  question: string
  answer: string
  source: string
  createdAt: number
  updatedAt: number
}

export interface Stats {
  tripCount: number
  logEntryCount: number
  totalMileage: number | null
  avgConsumptionPer100Km: number | null
  mostUsedRecipe: { name: string; count: number } | null
}
