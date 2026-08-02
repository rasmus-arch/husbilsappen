import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'

const router = Router()

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { lat, lon } = req.query
    const latNum = Number(lat)
    const lonNum = Number(lon)
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return res.status(400).json({ error: 'lat och lon krävs' })
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(latNum)}&lon=${encodeURIComponent(lonNum)}&zoom=16&addressdetails=0`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Husbilsappen/1.0 (personligt bruk)' },
    })
    if (!response.ok) return res.status(502).json({ error: 'Kunde inte slå upp adress' })
    const data = await response.json()
    res.json({ address: data.display_name ?? null })
  }),
)

export default router
