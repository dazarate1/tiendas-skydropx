import { sql } from './db'
import { hashPassword, passwordMatches, type Role } from './session'

export interface Account {
  id: string
  email: string
  role: Role
  brand_id: string | null
  name: string
  active: boolean
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

export async function findAccountByEmail(email: string): Promise<Account | null> {
  const [row] = await sql<Account[]>`
    select id, email, role, brand_id, name, active
      from accounts where email = ${normalizeEmail(email)}`
  return row ?? null
}

export async function authenticate(email: string, password: string): Promise<Account | null> {
  const [row] = await sql<(Account & { password_hash: string })[]>`
    select id, email, role, brand_id, name, active, password_hash
      from accounts where email = ${normalizeEmail(email)}`

  if (!row || !row.active) return null
  if (!(await passwordMatches(password, row.password_hash))) return null

  await sql`update accounts set last_login_at = now() where id = ${row.id}`
  return { id: row.id, email: row.email, role: row.role, brand_id: row.brand_id, name: row.name, active: row.active }
}

export async function createAccount(input: {
  email: string
  password: string
  role: Role
  brandId?: string | null
  name?: string
}): Promise<Account> {
  const [row] = await sql<Account[]>`
    insert into accounts (email, password_hash, role, brand_id, name)
    values (${normalizeEmail(input.email)}, ${await hashPassword(input.password)},
            ${input.role}, ${input.brandId ?? null}, ${input.name ?? ''})
    returning id, email, role, brand_id, name, active`
  return row
}

export async function setAccountPassword(accountId: string, password: string): Promise<void> {
  await sql`update accounts set password_hash = ${await hashPassword(password)} where id = ${accountId}`
}

export async function setAccountActive(accountId: string, active: boolean): Promise<void> {
  await sql`update accounts set active = ${active} where id = ${accountId}`
}

export async function brandOwner(brandId: string): Promise<Account | null> {
  const [row] = await sql<Account[]>`
    select id, email, role, brand_id, name, active
      from accounts where brand_id = ${brandId} and role = 'brand'`
  return row ?? null
}

// el primer acceso de la asesora se siembra desde variables de entorno
export async function bootstrapAdvisor(email: string, password: string): Promise<Account | null> {
  if (!email || !password) return null

  const [{ total }] = await sql<{ total: number }[]>`
    select count(*)::int as total from accounts where role = 'advisor'`
  if (total > 0) return null

  return createAccount({ email, password, role: 'advisor', name: 'Asesora' })
}
