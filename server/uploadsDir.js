import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const uploadsDir = path.join(__dirname, 'uploads')

fs.mkdirSync(uploadsDir, { recursive: true })
