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

function toManual(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    fileUrl: `/uploads/${row.file_path}`,
    fileType: row.file_type,
    notes: row.notes,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM manuals ORDER BY category ASC, title ASC')
    res.json(rows.map(toManual))
  }),
)

router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { title, category, notes } = req.body
    if (!String(title ?? '').trim()) return res.status(400).json({ error: 'Titel krävs' })
    if (!req.file) return res.status(400).json({ error: 'Fil krävs' })
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query(
      'INSERT INTO manuals (id, title, category, file_path, file_type, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, String(title).trim(), String(category ?? ''), req.file.filename, req.file.mimetype, String(notes ?? ''), now, now],
    )
    const [rows] = await pool.query('SELECT * FROM manuals WHERE id = ?', [id])
    res.status(201).json(toManual(rows[0]))
  }),
)

router.patch(
  '/:id',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { title, category, notes } = req.body
    const now = Date.now()

    const [existingRows] = await pool.query('SELECT * FROM manuals WHERE id = ?', [id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Dokumentet hittades inte' })
    const existing = existingRows[0]

    const filePath = req.file ? req.file.filename : existing.file_path
    const fileType = req.file ? req.file.mimetype : existing.file_type

    await pool.query(
      'UPDATE manuals SET title = ?, category = ?, file_path = ?, file_type = ?, notes = ?, updated_at = ? WHERE id = ?',
      [
        title !== undefined ? String(title).trim() : existing.title,
        category !== undefined ? String(category) : existing.category,
        filePath,
        fileType,
        notes !== undefined ? String(notes) : existing.notes,
        now,
        id,
      ],
    )

    if (req.file && existing.file_path) {
      await fs.unlink(path.join(uploadsDir, existing.file_path)).catch(() => {})
    }

    const [rows] = await pool.query('SELECT * FROM manuals WHERE id = ?', [id])
    res.json(toManual(rows[0]))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT file_path FROM manuals WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Dokumentet hittades inte' })
    await pool.query('DELETE FROM manuals WHERE id = ?', [req.params.id])
    if (rows[0].file_path) {
      await fs.unlink(path.join(uploadsDir, rows[0].file_path)).catch(() => {})
    }
    res.status(204).end()
  }),
)

export default router
