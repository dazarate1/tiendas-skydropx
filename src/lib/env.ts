const REQUIRED = [
  'DATABASE_URL',
  'CREDENTIALS_KEY',
  'SESSION_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'NEXT_PUBLIC_ROOT_DOMAIN',
] as const

type Key = (typeof REQUIRED)[number]

export function env(key: Key): string {
  const value = process.env[key]
  if (!value) throw new Error(`Variable de entorno requerida: ${key}`)
  return value
}

export function checkEnv(): string[] {
  return REQUIRED.filter((k) => !process.env[k])
}

export function rootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'
}
