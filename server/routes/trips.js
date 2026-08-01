import { Router } from 'express'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

function toTrip(row, recipeSelections, extraItems) {
  return {
    id: row.id,
    name: row.name,
    recipeSelections: recipeSelections ?? [],
    extraItems: extraItems ?? [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

async function loadSelections(connection, tripId) {
  const [rows] = await connection.query(
    'SELECT recipe_id, portions FROM trip_recipe_selections WHERE trip_id = ?',
    [tripId],
  )
  return rows.map((r) => ({ recipeId: r.recipe_id, portions: r.portions }))
}

async function loadExtraItems(connection, tripId) {
  const [rows] = await connection.query(
    'SELECT id, name, amount, unit FROM trip_extra_items WHERE trip_id = ? ORDER BY sort_order ASC',
    [tripId],
  )
  return rows.map((r) => ({ id: r.id, name: r.name, amount: r.amount, unit: r.unit }))
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [trips] = await pool.query('SELECT * FROM trips ORDER BY updated_at DESC')
    const [counts] = await pool.query(
      'SELECT trip_id, COUNT(*) AS cnt FROM trip_recipe_selections GROUP BY trip_id',
    )
    const countByTrip = new Map(counts.map((c) => [c.trip_id, c.cnt]))
    res.json(
      trips.map((row) => ({
        id: row.id,
        name: row.name,
        recipeCount: countByTrip.get(row.id) ?? 0,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      })),
    )
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM trips WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Resan hittades inte' })
    const selections = await loadSelections(pool, req.params.id)
    const extraItems = await loadExtraItems(pool, req.params.id)
    res.json(toTrip(rows[0], selections, extraItems))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name } = req.body
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query('INSERT INTO trips (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      id,
      String(name ?? '').trim() || 'Ny resa',
      now,
      now,
    ])
    const [rows] = await pool.query('SELECT * FROM trips WHERE id = ?', [id])
    res.status(201).json(toTrip(rows[0], [], []))
  }),
)

async function replaceExtraItems(connection, tripId, items) {
  await connection.query('DELETE FROM trip_extra_items WHERE trip_id = ?', [tripId])
  if (!items || items.length === 0) return
  const values = items.map((item, index) => [
    crypto.randomUUID(),
    tripId,
    String(item.name ?? '').trim(),
    Number(item.amount) || 0,
    String(item.unit ?? '').trim(),
    index,
  ])
  await connection.query(
    'INSERT INTO trip_extra_items (id, trip_id, name, amount, unit, sort_order) VALUES ?',
    [values],
  )
}

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { name, recipeSelections, extraItems } = req.body
    const now = Date.now()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      if (name !== undefined) {
        const [result] = await connection.query('UPDATE trips SET name = ?, updated_at = ? WHERE id = ?', [
          String(name).trim(),
          now,
          id,
        ])
        if (result.affectedRows === 0) {
          await connection.rollback()
          return res.status(404).json({ error: 'Resan hittades inte' })
        }
      } else {
        const [result] = await connection.query('UPDATE trips SET updated_at = ? WHERE id = ?', [now, id])
        if (result.affectedRows === 0) {
          await connection.rollback()
          return res.status(404).json({ error: 'Resan hittades inte' })
        }
      }

      if (recipeSelections !== undefined) {
        await connection.query('DELETE FROM trip_recipe_selections WHERE trip_id = ?', [id])
        if (recipeSelections.length > 0) {
          const values = recipeSelections.map((s) => [
            crypto.randomUUID(),
            id,
            s.recipeId,
            Number(s.portions) || 0,
          ])
          await connection.query(
            'INSERT INTO trip_recipe_selections (id, trip_id, recipe_id, portions) VALUES ?',
            [values],
          )
        }
      }

      if (extraItems !== undefined) {
        await replaceExtraItems(connection, id, extraItems)
      }

      await connection.commit()
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }

    const [rows] = await pool.query('SELECT * FROM trips WHERE id = ?', [id])
    const selections = await loadSelections(pool, id)
    const items = await loadExtraItems(pool, id)
    res.json(toTrip(rows[0], selections, items))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM trips WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Resan hittades inte' })
    res.status(204).end()
  }),
)

export default router
