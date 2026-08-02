import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()
const SINGLETON_ID = 'singleton'

function toVehicle(row) {
  if (!row) {
    return {
      lengthM: null,
      widthM: null,
      heightM: null,
      totalWeightKg: null,
      curbWeightKg: null,
      registrationNumber: '',
      waterTankL: null,
      wasteWaterTankL: null,
      notes: '',
      updatedAt: null,
    }
  }
  return {
    lengthM: row.length_m,
    widthM: row.width_m,
    heightM: row.height_m,
    totalWeightKg: row.total_weight_kg,
    curbWeightKg: row.curb_weight_kg,
    registrationNumber: row.registration_number ?? '',
    waterTankL: row.water_tank_l,
    wasteWaterTankL: row.waste_water_tank_l,
    notes: row.notes ?? '',
    updatedAt: Number(row.updated_at),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM vehicle_data WHERE id = ?', [SINGLETON_ID])
    res.json(toVehicle(rows[0]))
  }),
)

function numOrNull(value) {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { lengthM, widthM, heightM, totalWeightKg, curbWeightKg, registrationNumber, waterTankL, wasteWaterTankL, notes } =
      req.body
    const now = Date.now()
    await pool.query(
      `INSERT INTO vehicle_data
        (id, length_m, width_m, height_m, total_weight_kg, curb_weight_kg, registration_number, water_tank_l, waste_water_tank_l, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        length_m = VALUES(length_m), width_m = VALUES(width_m), height_m = VALUES(height_m),
        total_weight_kg = VALUES(total_weight_kg), curb_weight_kg = VALUES(curb_weight_kg),
        registration_number = VALUES(registration_number), water_tank_l = VALUES(water_tank_l),
        waste_water_tank_l = VALUES(waste_water_tank_l), notes = VALUES(notes), updated_at = VALUES(updated_at)`,
      [
        SINGLETON_ID,
        numOrNull(lengthM),
        numOrNull(widthM),
        numOrNull(heightM),
        numOrNull(totalWeightKg),
        numOrNull(curbWeightKg),
        String(registrationNumber ?? '').trim() || null,
        numOrNull(waterTankL),
        numOrNull(wasteWaterTankL),
        String(notes ?? ''),
        now,
      ],
    )
    const [rows] = await pool.query('SELECT * FROM vehicle_data WHERE id = ?', [SINGLETON_ID])
    res.json(toVehicle(rows[0]))
  }),
)

export default router
