import { Router } from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import multer from 'multer'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'
import { uploadsDir } from '../uploadsDir.js'

const router = Router()

const ALLOWED_MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = ALLOWED_MIME_TO_EXT[file.mimetype] ?? ''
      cb(null, `${crypto.randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TO_EXT[file.mimetype]) {
      cb(new Error('Endast bildfiler (JPEG, PNG, WEBP, GIF) eller PDF tillåts'))
      return
    }
    cb(null, true)
  },
})

function toEntry(row) {
  return {
    id: row.id,
    date: row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : row.entry_date,
    title: row.title,
    mileage: row.mileage,
    cost: row.cost,
    notes: row.notes,
    receiptUrl: row.receipt_path ? `/uploads/${row.receipt_path}` : null,
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
  upload.single('receipt'),
  asyncHandler(async (req, res) => {
    const { date, title, mileage, cost, notes } = req.body
    if (!date || !String(title ?? '').trim()) return res.status(400).json({ error: 'Datum och titel krävs' })
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query(
      'INSERT INTO service_entries (id, entry_date, title, mileage, cost, notes, receipt_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        date,
        String(title).trim(),
        mileage === '' || mileage == null ? null : Number(mileage),
        cost === '' || cost == null ? null : Number(cost),
        String(notes ?? ''),
        req.file?.filename ?? null,
        now,
        now,
      ],
    )
    const [rows] = await pool.query('SELECT * FROM service_entries WHERE id = ?', [id])
    res.status(201).json(toEntry(rows[0]))
  }),
)

router.patch(
  '/:id',
  upload.single('receipt'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { date, title, mileage, cost, notes } = req.body
    const now = Date.now()
    const [existingRows] = await pool.query('SELECT * FROM service_entries WHERE id = ?', [id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Posten hittades inte' })
    const existing = existingRows[0]
    const receiptPath = req.file ? req.file.filename : existing.receipt_path
    await pool.query(
      'UPDATE service_entries SET entry_date = ?, title = ?, mileage = ?, cost = ?, notes = ?, receipt_path = ?, updated_at = ? WHERE id = ?',
      [
        date ?? existing.entry_date,
        title !== undefined ? String(title).trim() : existing.title,
        mileage !== undefined ? (mileage === '' || mileage === null ? null : Number(mileage)) : existing.mileage,
        cost !== undefined ? (cost === '' || cost === null ? null : Number(cost)) : existing.cost,
        notes !== undefined ? String(notes) : existing.notes,
        receiptPath,
        now,
        id,
      ],
    )
    if (req.file && existing.receipt_path) {
      await fs.unlink(path.join(uploadsDir, existing.receipt_path)).catch(() => {})
    }
    const [rows] = await pool.query('SELECT * FROM service_entries WHERE id = ?', [id])
    res.json(toEntry(rows[0]))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT receipt_path FROM service_entries WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Posten hittades inte' })
    await pool.query('DELETE FROM service_entries WHERE id = ?', [req.params.id])
    if (rows[0].receipt_path) {
      await fs.unlink(path.join(uploadsDir, rows[0].receipt_path)).catch(() => {})
    }
    res.status(204).end()
  }),
)

export default router
