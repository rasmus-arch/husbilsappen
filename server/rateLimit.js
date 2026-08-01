const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

export function loginRateLimit(req, res, next) {
  const key = req.ip
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { windowStart: now, count: 1 })
    return next()
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'För många försök, vänta en stund och försök igen.' })
  }

  entry.count += 1
  next()
}
