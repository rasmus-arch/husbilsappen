import { Router } from 'express'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

async function loadItems(connection, checklistIds) {
  if (checklistIds.length === 0) return new Map()
  const [rows] = await connection.query(
    'SELECT id, checklist_id, text, checked FROM checklist_items WHERE checklist_id IN (?) ORDER BY sort_order ASC',
    [checklistIds],
  )
  const byChecklist = new Map()
  for (const row of rows) {
    const list = byChecklist.get(row.checklist_id) ?? []
    list.push({ id: row.id, text: row.text, checked: !!row.checked })
    byChecklist.set(row.checklist_id, list)
  }
  return byChecklist
}

function toChecklist(row, items) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    items: items ?? [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { kind } = req.query
    const [rows] = kind
      ? await pool.query('SELECT * FROM checklists WHERE kind = ? ORDER BY name ASC', [kind])
      : await pool.query('SELECT * FROM checklists ORDER BY name ASC')
    const itemsByChecklist = await loadItems(pool, rows.map((r) => r.id))
    res.json(rows.map((row) => toChecklist(row, itemsByChecklist.get(row.id))))
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM checklists WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Listan hittades inte' })
    const itemsByChecklist = await loadItems(pool, [req.params.id])
    res.json(toChecklist(rows[0], itemsByChecklist.get(req.params.id)))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { kind, name } = req.body
    if (kind !== 'packlista' && kind !== 'rutin') {
      return res.status(400).json({ error: 'Ogiltig typ' })
    }
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query('INSERT INTO checklists (id, kind, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      id,
      kind,
      String(name ?? '').trim(),
      now,
      now,
    ])
    const [rows] = await pool.query('SELECT * FROM checklists WHERE id = ?', [id])
    res.status(201).json(toChecklist(rows[0], []))
  }),
)

async function replaceItems(connection, checklistId, items) {
  await connection.query('DELETE FROM checklist_items WHERE checklist_id = ?', [checklistId])
  if (!items || items.length === 0) return
  const values = items.map((item, index) => [
    item.id && item.id.length > 0 ? item.id : crypto.randomUUID(),
    checklistId,
    String(item.text ?? '').trim(),
    item.checked ? 1 : 0,
    index,
  ])
  await connection.query(
    'INSERT INTO checklist_items (id, checklist_id, text, checked, sort_order) VALUES ?',
    [values],
  )
}

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { name, items } = req.body
    const now = Date.now()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [result] = await connection.query('UPDATE checklists SET name = COALESCE(?, name), updated_at = ? WHERE id = ?', [
        name !== undefined ? String(name).trim() : null,
        now,
        id,
      ])
      if (result.affectedRows === 0) {
        await connection.rollback()
        return res.status(404).json({ error: 'Listan hittades inte' })
      }
      if (items !== undefined) {
        await replaceItems(connection, id, items)
      }
      await connection.commit()
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }
    const [rows] = await pool.query('SELECT * FROM checklists WHERE id = ?', [id])
    const itemsByChecklist = await loadItems(pool, [id])
    res.json(toChecklist(rows[0], itemsByChecklist.get(id)))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM checklists WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Listan hittades inte' })
    res.status(204).end()
  }),
)

export default router
