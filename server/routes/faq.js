import { Router } from 'express'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

function toFaqCard(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    source: row.source,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM faq_cards ORDER BY source ASC, created_at ASC')
    res.json(rows.map(toFaqCard))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { question, answer, source } = req.body
    if (!String(question ?? '').trim()) return res.status(400).json({ error: 'Fråga krävs' })
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query(
      'INSERT INTO faq_cards (id, question, answer, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, String(question).trim(), String(answer ?? ''), String(source ?? ''), now, now],
    )
    const [rows] = await pool.query('SELECT * FROM faq_cards WHERE id = ?', [id])
    res.status(201).json(toFaqCard(rows[0]))
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { question, answer, source } = req.body
    const now = Date.now()
    const [existingRows] = await pool.query('SELECT * FROM faq_cards WHERE id = ?', [id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Kortet hittades inte' })
    const existing = existingRows[0]
    await pool.query('UPDATE faq_cards SET question = ?, answer = ?, source = ?, updated_at = ? WHERE id = ?', [
      question !== undefined ? String(question).trim() : existing.question,
      answer !== undefined ? String(answer) : existing.answer,
      source !== undefined ? String(source) : existing.source,
      now,
      id,
    ])
    const [rows] = await pool.query('SELECT * FROM faq_cards WHERE id = ?', [id])
    res.json(toFaqCard(rows[0]))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM faq_cards WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Kortet hittades inte' })
    res.status(204).end()
  }),
)

export default router
