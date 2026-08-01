import { Router } from 'express'
import { checkShareToken } from '../auth.js'
import { shareTokenRateLimit } from '../rateLimit.js'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

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
  '/logbook/:token',
  shareTokenRateLimit,
  asyncHandler(async (req, res) => {
    if (!checkShareToken(req.params.token)) {
      return res.status(404).json({ error: 'Ogiltig länk' })
    }
    const [rows] = await pool.query('SELECT * FROM log_entries ORDER BY entry_date DESC, created_at DESC')
    res.json(rows.map(toEntry))
  }),
)

export default router
