import { Router } from 'express'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

function toItem(row) {
  return {
    id: row.id,
    location: row.location,
    name: row.name,
    amount: row.amount,
    unit: row.unit,
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { location } = req.query
    const [rows] = location
      ? await pool.query('SELECT * FROM inventory_items WHERE location = ? ORDER BY name ASC', [location])
      : await pool.query('SELECT * FROM inventory_items ORDER BY name ASC')
    res.json(rows.map(toItem))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { location, name, amount, unit } = req.body
    if (location !== 'hemma' && location !== 'husbil') {
      return res.status(400).json({ error: 'Ogiltig plats' })
    }
    const id = crypto.randomUUID()
    const now = Date.now()
    await pool.query(
      'INSERT INTO inventory_items (id, location, name, amount, unit, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, location, String(name ?? '').trim(), Number(amount) || 0, String(unit ?? '').trim() || 'st', now],
    )
    const [rows] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id])
    res.status(201).json(toItem(rows[0]))
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { name, amount, unit } = req.body
    const fields = []
    const values = []
    if (name !== undefined) {
      fields.push('name = ?')
      values.push(String(name).trim())
    }
    if (amount !== undefined) {
      fields.push('amount = ?')
      values.push(Number(amount) || 0)
    }
    if (unit !== undefined) {
      fields.push('unit = ?')
      values.push(String(unit).trim())
    }
    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const [result] = await pool.query(`UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`, values)
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Varan hittades inte' })
    const [rows] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id])
    res.json(toItem(rows[0]))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM inventory_items WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Varan hittades inte' })
    res.status(204).end()
  }),
)

// Flyttar (upp till) angiven mängd av varje vara mellan två platser, t.ex. för
// "Packa upp resan"-knappen som flyttar tillbaka det som togs till husbilen.
router.post(
  '/move',
  asyncHandler(async (req, res) => {
    const { items, from, to } = req.body
    if (from !== 'hemma' && from !== 'husbil') return res.status(400).json({ error: 'Ogiltig avsändarplats' })
    if (to !== 'hemma' && to !== 'husbil') return res.status(400).json({ error: 'Ogiltig mottagarplats' })
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items krävs' })

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const now = Date.now()
      for (const item of items) {
        const name = String(item.name ?? '').trim()
        const unit = String(item.unit ?? '').trim()
        const wantAmount = Number(item.amount) || 0
        if (!name || wantAmount <= 0) continue

        const [fromRows] = await connection.query(
          'SELECT id, amount FROM inventory_items WHERE location = ? AND LOWER(name) = LOWER(?) AND LOWER(unit) = LOWER(?) LIMIT 1',
          [from, name, unit],
        )
        if (fromRows.length === 0) continue
        const movedAmount = Math.min(wantAmount, fromRows[0].amount)
        if (movedAmount <= 0) continue
        const remaining = fromRows[0].amount - movedAmount

        if (remaining > 0) {
          await connection.query('UPDATE inventory_items SET amount = ?, updated_at = ? WHERE id = ?', [
            remaining,
            now,
            fromRows[0].id,
          ])
        } else {
          await connection.query('DELETE FROM inventory_items WHERE id = ?', [fromRows[0].id])
        }

        const [toRows] = await connection.query(
          'SELECT id, amount FROM inventory_items WHERE location = ? AND LOWER(name) = LOWER(?) AND LOWER(unit) = LOWER(?) LIMIT 1',
          [to, name, unit],
        )
        if (toRows.length > 0) {
          await connection.query('UPDATE inventory_items SET amount = amount + ?, updated_at = ? WHERE id = ?', [
            movedAmount,
            now,
            toRows[0].id,
          ])
        } else {
          await connection.query(
            'INSERT INTO inventory_items (id, location, name, amount, unit, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), to, name, movedAmount, unit, now],
          )
        }
      }
      await connection.commit()
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }
    res.status(204).end()
  }),
)

export default router
