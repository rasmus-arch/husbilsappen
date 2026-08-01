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
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = ALLOWED_MIME_TO_EXT[file.mimetype] ?? ''
      cb(null, `${crypto.randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TO_EXT[file.mimetype]) {
      cb(new Error('Endast bildfiler (JPEG, PNG, WEBP, GIF) tillåts'))
      return
    }
    cb(null, true)
  },
})

function toEntry(row) {
  return {
    id: row.id,
    date: row.entry_date instanceof Date ? row.entry_date.toISOString().slice(0, 10) : row.entry_date,
    mileage: row.mileage === null ? null : row.mileage,
    note: row.note,
    imageUrl: row.image_path ? `/uploads/${row.image_path}` : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM log_entries ORDER BY entry_date DESC, created_at DESC')
    res.json(rows.map(toEntry))
  }),
)

router.post(
  '/',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { date, mileage, note } = req.body
    if (!date) return res.status(400).json({ error: 'Datum krävs' })
    const id = crypto.randomUUID()
    const now = Date.now()
    const mileageValue = mileage === undefined || mileage === '' ? null : Number(mileage)
    await pool.query(
      'INSERT INTO log_entries (id, entry_date, mileage, note, image_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, date, mileageValue, String(note ?? ''), req.file?.filename ?? null, now, now],
    )
    const [rows] = await pool.query('SELECT * FROM log_entries WHERE id = ?', [id])
    res.status(201).json(toEntry(rows[0]))
  }),
)

router.patch(
  '/:id',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { date, mileage, note } = req.body
    const now = Date.now()

    const [existingRows] = await pool.query('SELECT * FROM log_entries WHERE id = ?', [id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Loggposten hittades inte' })

    const mileageValue = mileage === undefined || mileage === '' ? null : Number(mileage)
    const newImagePath = req.file ? req.file.filename : existingRows[0].image_path

    await pool.query(
      'UPDATE log_entries SET entry_date = ?, mileage = ?, note = ?, image_path = ?, updated_at = ? WHERE id = ?',
      [date ?? existingRows[0].entry_date, mileageValue, note ?? existingRows[0].note, newImagePath, now, id],
    )

    if (req.file && existingRows[0].image_path) {
      await fs.unlink(path.join(uploadsDir, existingRows[0].image_path)).catch(() => {})
    }

    const [rows] = await pool.query('SELECT * FROM log_entries WHERE id = ?', [id])
    res.json(toEntry(rows[0]))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT image_path FROM log_entries WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Loggposten hittades inte' })
    await pool.query('DELETE FROM log_entries WHERE id = ?', [req.params.id])
    if (rows[0].image_path) {
      await fs.unlink(path.join(uploadsDir, rows[0].image_path)).catch(() => {})
    }
    res.status(204).end()
  }),
)

export default router
