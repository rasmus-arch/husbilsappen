import { start } from './app.js'

start().catch((err) => {
  console.error('Kunde inte starta servern:', err)
  process.exit(1)
})
