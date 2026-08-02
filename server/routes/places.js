import { Router } from 'express'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

function toPlace(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rating: row.rating,
    notes: row.notes,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM places ORDER BY name ASC')
    res.json(rows.map(toPlace))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, description, rating, notes } = req.body
    if (!String(name ?? '').trim()) return res.status(400).json({ error: 'Namn krävs' })
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query(
      'INSERT INTO places (id, name, description, rating, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, String(name).trim(), String(description ?? ''), rating === '' || rating == null ? null : Number(rating), String(notes ?? ''), now, now],
    )
    const [rows] = await pool.query('SELECT * FROM places WHERE id = ?', [id])
    res.status(201).json(toPlace(rows[0]))
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { name, description, rating, notes } = req.body
    const now = Date.now()
    const [existingRows] = await pool.query('SELECT * FROM places WHERE id = ?', [id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Platsen hittades inte' })
    const existing = existingRows[0]
    await pool.query('UPDATE places SET name = ?, description = ?, rating = ?, notes = ?, updated_at = ? WHERE id = ?', [
      name !== undefined ? String(name).trim() : existing.name,
      description !== undefined ? String(description) : existing.description,
      rating !== undefined ? (rating === '' || rating === null ? null : Number(rating)) : existing.rating,
      notes !== undefined ? String(notes) : existing.notes,
      now,
      id,
    ])
    const [rows] = await pool.query('SELECT * FROM places WHERE id = ?', [id])
    res.json(toPlace(rows[0]))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM places WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Platsen hittades inte' })
    res.status(204).end()
  }),
)

export default router
