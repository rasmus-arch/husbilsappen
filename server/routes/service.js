import { Router } from 'express'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

function toEntry(row) {
  return {
    id: row.id,
    date: row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : row.entry_date,
    title: row.title,
    mileage: row.mileage,
    cost: row.cost,
    notes: row.notes,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM service_entries ORDER BY entry_date DESC, created_at DESC')
    res.json(rows.map(toEntry))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { date, title, mileage, cost, notes } = req.body
    if (!date || !String(title ?? '').trim()) return res.status(400).json({ error: 'Datum och titel krävs' })
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query(
      'INSERT INTO service_entries (id, entry_date, title, mileage, cost, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, date, String(title).trim(), mileage === '' || mileage == null ? null : Number(mileage), cost === '' || cost == null ? null : Number(cost), String(notes ?? ''), now, now],
    )
    const [rows] = await pool.query('SELECT * FROM service_entries WHERE id = ?', [id])
    res.status(201).json(toEntry(rows[0]))
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { date, title, mileage, cost, notes } = req.body
    const now = Date.now()
    const [existingRows] = await pool.query('SELECT * FROM service_entries WHERE id = ?', [id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Posten hittades inte' })
    const existing = existingRows[0]
    await pool.query(
      'UPDATE service_entries SET entry_date = ?, title = ?, mileage = ?, cost = ?, notes = ?, updated_at = ? WHERE id = ?',
      [
        date ?? existing.entry_date,
        title !== undefined ? String(title).trim() : existing.title,
        mileage !== undefined ? (mileage === '' || mileage === null ? null : Number(mileage)) : existing.mileage,
        cost !== undefined ? (cost === '' || cost === null ? null : Number(cost)) : existing.cost,
        notes !== undefined ? String(notes) : existing.notes,
        now,
        id,
      ],
    )
    const [rows] = await pool.query('SELECT * FROM service_entries WHERE id = ?', [id])
    res.json(toEntry(rows[0]))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM service_entries WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Posten hittades inte' })
    res.status(204).end()
  }),
)

export default router
