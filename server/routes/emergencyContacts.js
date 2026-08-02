import { Router } from 'express'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

function toContact(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    category: row.category,
    notes: row.notes,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM emergency_contacts ORDER BY category ASC, name ASC')
    res.json(rows.map(toContact))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, phone, category, notes } = req.body
    if (!String(name ?? '').trim()) return res.status(400).json({ error: 'Namn krävs' })
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query(
      'INSERT INTO emergency_contacts (id, name, phone, category, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, String(name).trim(), String(phone ?? ''), String(category ?? ''), String(notes ?? ''), now, now],
    )
    const [rows] = await pool.query('SELECT * FROM emergency_contacts WHERE id = ?', [id])
    res.status(201).json(toContact(rows[0]))
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { name, phone, category, notes } = req.body
    const now = Date.now()
    const [existingRows] = await pool.query('SELECT * FROM emergency_contacts WHERE id = ?', [id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Kontakten hittades inte' })
    const existing = existingRows[0]
    await pool.query('UPDATE emergency_contacts SET name = ?, phone = ?, category = ?, notes = ?, updated_at = ? WHERE id = ?', [
      name !== undefined ? String(name).trim() : existing.name,
      phone !== undefined ? String(phone) : existing.phone,
      category !== undefined ? String(category) : existing.category,
      notes !== undefined ? String(notes) : existing.notes,
      now,
      id,
    ])
    const [rows] = await pool.query('SELECT * FROM emergency_contacts WHERE id = ?', [id])
    res.json(toContact(rows[0]))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM emergency_contacts WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Kontakten hittades inte' })
    res.status(204).end()
  }),
)

export default router
