import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireAuth } from './auth.js'
import { ensureDefaultChecklist, seedDefaultsIfEmpty } from './seed.js'
import { uploadsDir } from './uploadsDir.js'
import authRoutes from './routes/auth.js'
import recipeRoutes from './routes/recipes.js'
import inventoryRoutes from './routes/inventory.js'
import tripRoutes from './routes/trips.js'
import checklistRoutes from './routes/checklists.js'
import logbookRoutes from './routes/logbook.js'
import publicRoutes from './routes/public.js'
import vehicleRoutes from './routes/vehicle.js'
import serviceRoutes from './routes/service.js'
import placeRoutes from './routes/places.js'
import emergencyContactRoutes from './routes/emergencyContacts.js'
import fuelRoutes from './routes/fuel.js'
import statsRoutes from './routes/stats.js'
import manualRoutes from './routes/manuals.js'
import geocodeRoutes from './routes/geocode.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(express.json())
  app.use(cookieParser())

  app.use('/api/auth', authRoutes)
  app.use('/api/recipes', requireAuth, recipeRoutes)
  app.use('/api/inventory', requireAuth, inventoryRoutes)
  app.use('/api/trips', requireAuth, tripRoutes)
  app.use('/api/checklists', requireAuth, checklistRoutes)
  app.use('/api/logbook', requireAuth, logbookRoutes)
  app.use('/api/vehicle', requireAuth, vehicleRoutes)
  app.use('/api/service', requireAuth, serviceRoutes)
  app.use('/api/places', requireAuth, placeRoutes)
  app.use('/api/emergency-contacts', requireAuth, emergencyContactRoutes)
  app.use('/api/fuel', requireAuth, fuelRoutes)
  app.use('/api/stats', requireAuth, statsRoutes)
  app.use('/api/manuals', requireAuth, manualRoutes)
  app.use('/api/geocode', requireAuth, geocodeRoutes)
  app.use('/api/public', publicRoutes)

  // Publikt tillgängligt så att både den inloggade appen och den delade
  // loggboks-länken kan visa bilder utan inloggning. Filnamnen är slumpade
  // UUID:n, så de går inte att gissa sig till.
  app.use('/uploads', express.static(uploadsDir))

  app.use(express.static(distDir))
  app.get(/^(?!\/api\/|\/uploads\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })

  app.use((err, req, res, _next) => {
    if (err instanceof multer.MulterError || /bildfiler/.test(err.message ?? '')) {
      return res.status(400).json({ error: err.message })
    }
    console.error(err)
    res.status(500).json({ error: 'Internt serverfel' })
  })

  return app
}

export async function start() {
  await seedDefaultsIfEmpty()
  await ensureDefaultChecklist('rutin', 'Husdjur inför resa', [
    'Vaccinationsintyg/pass med',
    'Koppel & sele',
    'Foder & vattenskål',
    'Filt/bädd',
    'Leksaker',
    'Eventuella mediciner',
    'Bilbälte/bur säkrat under färd',
    'ID-bricka på halsband',
  ])

  const app = createApp()
  const port = Number(process.env.PORT || 3000)
  app.listen(port, () => {
    console.log(`Husbilsappen kör på port ${port}`)
  })
}
