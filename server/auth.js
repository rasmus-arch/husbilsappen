import crypto from 'node:crypto'

const SESSION_COOKIE = 'husbil_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dagar

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET saknas. Sätt en lång slumpad sträng i miljövariablerna.')
  }
  return secret
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function createSessionToken() {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = String(expires)
  return `${payload}.${sign(payload)}`
}

export function isValidToken(token) {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expected = sign(payload)
  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false
  }
  return Number(payload) > Date.now()
}

export function checkPassword(candidate) {
  const appPassword = process.env.APP_PASSWORD?.trim()
  if (!appPassword) {
    throw new Error('APP_PASSWORD saknas. Sätt lösenordet i miljövariablerna.')
  }
  const candidateBuf = Buffer.from(String(candidate ?? '').trim())
  const expectedBuf = Buffer.from(appPassword)
  if (candidateBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(candidateBuf, expectedBuf)
}

export function checkShareToken(candidate) {
  const shareToken = process.env.LOGBOOK_SHARE_TOKEN?.trim()
  if (!shareToken) return false
  const candidateBuf = Buffer.from(String(candidate ?? '').trim())
  const expectedBuf = Buffer.from(shareToken)
  if (candidateBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(candidateBuf, expectedBuf)
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE)
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'Ej inloggad' })
  }
  next()
}

export function isAuthenticated(req) {
  return isValidToken(req.cookies?.[SESSION_COOKIE])
}
