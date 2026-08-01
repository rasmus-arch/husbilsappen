import { Router } from 'express'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

async function loadIngredients(connection, recipeIds) {
  if (recipeIds.length === 0) return new Map()
  const [rows] = await connection.query(
    `SELECT id, recipe_id, name, amount, unit FROM recipe_ingredients WHERE recipe_id IN (?) ORDER BY sort_order ASC`,
    [recipeIds],
  )
  const byRecipe = new Map()
  for (const row of rows) {
    const list = byRecipe.get(row.recipe_id) ?? []
    list.push({ id: row.id, name: row.name, amount: row.amount, unit: row.unit })
    byRecipe.set(row.recipe_id, list)
  }
  return byRecipe
}

function toRecipe(row, ingredients) {
  return {
    id: row.id,
    name: row.name,
    servings: row.servings,
    instructions: row.instructions,
    ingredients: ingredients ?? [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM recipes ORDER BY name ASC')
    const ingredientsByRecipe = await loadIngredients(pool, rows.map((r) => r.id))
    res.json(rows.map((row) => toRecipe(row, ingredientsByRecipe.get(row.id))))
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Receptet hittades inte' })
    const ingredientsByRecipe = await loadIngredients(pool, [req.params.id])
    res.json(toRecipe(rows[0], ingredientsByRecipe.get(req.params.id)))
  }),
)

async function replaceIngredients(connection, recipeId, ingredients) {
  await connection.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId])
  if (!ingredients || ingredients.length === 0) return
  const values = ingredients.map((ing, index) => [
    crypto.randomUUID(),
    recipeId,
    String(ing.name ?? '').trim(),
    Number(ing.amount) || 0,
    String(ing.unit ?? '').trim(),
    index,
  ])
  await connection.query(
    'INSERT INTO recipe_ingredients (id, recipe_id, name, amount, unit, sort_order) VALUES ?',
    [values],
  )
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, servings, instructions, ingredients } = req.body
    const id = crypto.randomUUID()
    const now = Date.now()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.query(
        'INSERT INTO recipes (id, name, servings, instructions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, String(name ?? '').trim(), Number(servings) || 1, String(instructions ?? ''), now, now],
      )
      await replaceIngredients(connection, id, ingredients)
      await connection.commit()
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }
    const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ?', [id])
    const ingredientsByRecipe = await loadIngredients(pool, [id])
    res.status(201).json(toRecipe(rows[0], ingredientsByRecipe.get(id)))
  }),
)

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { name, servings, instructions, ingredients } = req.body
    const now = Date.now()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [result] = await connection.query(
        'UPDATE recipes SET name = ?, servings = ?, instructions = ?, updated_at = ? WHERE id = ?',
        [String(name ?? '').trim(), Number(servings) || 1, String(instructions ?? ''), now, id],
      )
      if (result.affectedRows === 0) {
        await connection.rollback()
        return res.status(404).json({ error: 'Receptet hittades inte' })
      }
      await replaceIngredients(connection, id, ingredients)
      await connection.commit()
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }
    const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ?', [id])
    const ingredientsByRecipe = await loadIngredients(pool, [id])
    res.json(toRecipe(rows[0], ingredientsByRecipe.get(id)))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM recipes WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Receptet hittades inte' })
    res.status(204).end()
  }),
)

export default router
