import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [[tripCountRow]] = await pool.query('SELECT COUNT(*) AS cnt FROM trips')
    const [[logCountRow]] = await pool.query('SELECT COUNT(*) AS cnt FROM log_entries')
    const [[mileageRow]] = await pool.query(
      'SELECT MIN(mileage) AS min, MAX(mileage) AS max FROM log_entries WHERE mileage IS NOT NULL',
    )
    const [fuelRows] = await pool.query('SELECT mileage, liters FROM fuel_entries ORDER BY mileage ASC')
    const [[topRecipeRow]] = await pool.query(
      `SELECT r.name AS name, COUNT(*) AS cnt
       FROM trip_recipe_selections trs
       JOIN recipes r ON r.id = trs.recipe_id
       GROUP BY trs.recipe_id, r.name
       ORDER BY cnt DESC
       LIMIT 1`,
    )

    let avgConsumptionPer100Km = null
    if (fuelRows.length >= 2) {
      const totalLiters = fuelRows.slice(1).reduce((sum, r) => sum + r.liters, 0)
      const distance = fuelRows[fuelRows.length - 1].mileage - fuelRows[0].mileage
      if (distance > 0) avgConsumptionPer100Km = (totalLiters / distance) * 100
    }

    res.json({
      tripCount: tripCountRow.cnt,
      logEntryCount: logCountRow.cnt,
      totalMileage: mileageRow.max != null && mileageRow.min != null ? mileageRow.max - mileageRow.min : null,
      avgConsumptionPer100Km,
      mostUsedRecipe: topRecipeRow ? { name: topRecipeRow.name, count: topRecipeRow.cnt } : null,
    })
  }),
)

export default router
