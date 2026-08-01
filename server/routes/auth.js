import { Router } from 'express'
import { checkPassword, clearSessionCookie, createSessionToken, isAuthenticated, setSessionCookie } from '../auth.js'
import { loginRateLimit } from '../rateLimit.js'

const router = Router()

router.get('/me', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) })
})

router.post('/login', loginRateLimit, (req, res) => {
  const { password } = req.body ?? {}
  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Fel lösenord' })
  }
  setSessionCookie(res, createSessionToken())
  res.json({ authenticated: true })
})

router.post('/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ authenticated: false })
})

export default router
