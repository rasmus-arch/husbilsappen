import { Router } from 'express'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

function toEntry(row) {
  return {
    id: row.id,
    date: row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : row.entry_date,
    mileage: row.mileage,
    liters: row.liters,
    cost: row.cost,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM fuel_entries ORDER BY mileage DESC, entry_date DESC')
    res.json(rows.map(toEntry))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { date, mileage, liters, cost } = req.body
    if (!date || mileage === undefined || liters === undefined) {
      return res.status(400).json({ error: 'Datum, miltal och antal liter krävs' })
    }
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query(
      'INSERT INTO fuel_entries (id, entry_date, mileage, liters, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, date, Number(mileage) || 0, Number(liters) || 0, cost === '' || cost == null ? null : Number(cost), now, now],
    )
    const [rows] = await pool.query('SELECT * FROM fuel_entries WHERE id = ?', [id])
    res.status(201).json(toEntry(rows[0]))
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { date, mileage, liters, cost } = req.body
    const now = Date.now()
    const [existingRows] = await pool.query('SELECT * FROM fuel_entries WHERE id = ?', [id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Posten hittades inte' })
    const existing = existingRows[0]
    await pool.query('UPDATE fuel_entries SET entry_date = ?, mileage = ?, liters = ?, cost = ?, updated_at = ? WHERE id = ?', [
      date ?? existing.entry_date,
      mileage !== undefined ? Number(mileage) || 0 : existing.mileage,
      liters !== undefined ? Number(liters) || 0 : existing.liters,
      cost !== undefined ? (cost === '' || cost === null ? null : Number(cost)) : existing.cost,
      now,
      id,
    ])
    const [rows] = await pool.query('SELECT * FROM fuel_entries WHERE id = ?', [id])
    res.json(toEntry(rows[0]))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM fuel_entries WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Posten hittades inte' })
    res.status(204).end()
  }),
)

export default router
