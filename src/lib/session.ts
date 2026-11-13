const encoder = new TextEncoder()

export const SESSION_COOKIE = 'tienda_session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

const PBKDF2_ITERATIONS = 120_000

export type Role = 'advisor' | 'brand'

export interface Session {
  accountId: string
  role: Role
  brandId: string | null
  exp: number
}

function b64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function unb64url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
}

function bytesToB64(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += String.fromCharCode(b)
  return btoa(out)
}

function b64ToBytes(value: string): Uint8Array {
  const raw = atob(value)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(data)))
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createSessionToken(
  secret: string,
  session: Omit<Session, 'exp'>,
): Promise<string> {
  const payload = b64url(
    JSON.stringify({
      a: session.accountId,
      r: session.role,
      b: session.brandId,
      e: Date.now() + SESSION_TTL_MS,
    }),
  )
  return `${payload}.${await hmacHex(secret, payload)}`
}

export async function readSession(
  secret: string,
  token: string | undefined,
): Promise<Session | null> {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  if (!constantTimeEqual(await hmacHex(secret, payload), signature)) return null

  try {
    const data = JSON.parse(unb64url(payload)) as {
      a?: string
      r?: Role
      b?: string | null
      e?: number
    }
    if (!data.a || (data.r !== 'advisor' && data.r !== 'brand')) return null
    if (typeof data.e !== 'number' || data.e < Date.now()) return null
    if (data.r === 'brand' && !data.b) return null
    return { accountId: data.a, role: data.r, brandId: data.b ?? null, exp: data.e }
  } catch {
    return null
  }
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  )
  return bytesToB64(new Uint8Array(bits))
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const digest = await derive(plain, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToB64(salt)}$${digest}`
}

export async function passwordMatches(plain: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, digest] = stored.split('$')
  if (scheme !== 'pbkdf2' || !iterations || !salt || !digest) return false
  const candidate = await derive(plain, b64ToBytes(salt), Number(iterations))
  return constantTimeEqual(candidate, digest)
}
