import type { Checklist, ChecklistKind, InventoryItem, Location, Recipe, Trip } from './types'

export interface TripSummary {
  id: string
  name: string
  recipeCount: number
  createdAt: number
  updatedAt: number
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'same-origin',
  })

  if (res.status === 401) {
    onUnauthorized?.()
    throw new ApiError('Ej inloggad')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.error ?? `Fel: ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// --- Auth ---
export const authApi = {
  me: () => request<{ authenticated: boolean }>('/api/auth/me'),
  login: (password: string) =>
    request<{ authenticated: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  logout: () => request<{ authenticated: boolean }>('/api/auth/logout', { method: 'POST' }),
}

// --- Recipes ---
export type RecipeInput = Pick<Recipe, 'name' | 'servings' | 'instructions' | 'ingredients'>

export const recipesApi = {
  list: () => request<Recipe[]>('/api/recipes'),
  get: (id: string) => request<Recipe>(`/api/recipes/${id}`),
  create: (data: RecipeInput) =>
    request<Recipe>('/api/recipes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: RecipeInput) =>
    request<Recipe>(`/api/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/api/recipes/${id}`, { method: 'DELETE' }),
}

// --- Inventory ---
export const inventoryApi = {
  list: (location?: Location) =>
    request<InventoryItem[]>(`/api/inventory${location ? `?location=${location}` : ''}`),
  create: (data: { location: Location; name: string; amount: number; unit: string }) =>
    request<InventoryItem>('/api/inventory', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, patch: Partial<Pick<InventoryItem, 'name' | 'amount' | 'unit'>>) =>
    request<InventoryItem>(`/api/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(`/api/inventory/${id}`, { method: 'DELETE' }),
}

// --- Trips ---
export const tripsApi = {
  list: () => request<TripSummary[]>('/api/trips'),
  get: (id: string) => request<Trip>(`/api/trips/${id}`),
  create: (name: string) => request<Trip>('/api/trips', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: string, patch: Partial<Pick<Trip, 'name' | 'recipeSelections'>>) =>
    request<Trip>(`/api/trips/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(`/api/trips/${id}`, { method: 'DELETE' }),
}

// --- Checklists ---
export const checklistsApi = {
  list: (kind?: ChecklistKind) => request<Checklist[]>(`/api/checklists${kind ? `?kind=${kind}` : ''}`),
  get: (id: string) => request<Checklist>(`/api/checklists/${id}`),
  create: (kind: ChecklistKind, name: string) =>
    request<Checklist>('/api/checklists', { method: 'POST', body: JSON.stringify({ kind, name }) }),
  update: (id: string, patch: Partial<Pick<Checklist, 'name' | 'items'>>) =>
    request<Checklist>(`/api/checklists/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(`/api/checklists/${id}`, { method: 'DELETE' }),
}
