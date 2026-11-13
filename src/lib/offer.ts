import { env } from './env'

const encoder = new TextEncoder()
const OFFER_TTL_MS = 30 * 60 * 1000

export interface SignedOffer {
  brandId: string
  quotationId: string
  rateId: string
  carrier: string
  chargedCop: number
  quotedCop: number
  subtotalCop: number
  weightGrams: number
  city: string
  exp: number
}

function b64url(input: string): string {
  const bytes = encoder.encode(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function unb64url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env('SESSION_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

// el precio del envio lo fija el servidor; el navegador solo devuelve el token
export async function signOffer(offer: Omit<SignedOffer, 'exp'>): Promise<string> {
  const payload = b64url(JSON.stringify({ ...offer, exp: Date.now() + OFFER_TTL_MS }))
  return `${payload}.${await sign(payload)}`
}

export async function readOffer(token: string): Promise<SignedOffer | null> {
  const [payload, signature] = String(token ?? '').split('.')
  if (!payload || !signature) return null
  if ((await sign(payload)) !== signature) return null
  try {
    const offer = JSON.parse(unb64url(payload)) as SignedOffer
    if (!offer.brandId || typeof offer.exp !== 'number' || offer.exp < Date.now()) return null
    return offer
  } catch {
    return null
  }
}
