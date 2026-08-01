import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireAuth } from './auth.js'
import { seedDefaultsIfEmpty } from './seed.js'
import authRoutes from './routes/auth.js'
import recipeRoutes from './routes/recipes.js'
import inventoryRoutes from './routes/inventory.js'
import tripRoutes from './routes/trips.js'
import checklistRoutes from './routes/checklists.js'

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

  app.use(express.static(distDir))
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })

  app.use((err, req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: 'Internt serverfel' })
  })

  return app
}

export async function start() {
  await seedDefaultsIfEmpty()
  const app = createApp()
  const port = Number(process.env.PORT || 3000)
  app.listen(port, () => {
    console.log(`Husbilsappen kör på port ${port}`)
  })
}
