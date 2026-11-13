import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

function key(): Buffer {
  const raw = process.env.CREDENTIALS_KEY
  if (!raw) throw new Error('CREDENTIALS_KEY no está definida')
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error('CREDENTIALS_KEY debe ser 32 bytes en base64')
  return buf
}

export function encrypt(plain: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join('.')
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Payload cifrado con formato inválido')
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function mask(value: string): string {
  if (value.length <= 10) return '•'.repeat(8)
  return `${value.slice(0, 6)}${'•'.repeat(8)}${value.slice(-4)}`
}
