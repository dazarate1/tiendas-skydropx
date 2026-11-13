import { cookies } from 'next/headers'
import { SESSION_COOKIE, readSession, type Session } from './session'
import { env } from './env'

export async function currentSession(): Promise<Session | null> {
  const store = await cookies()
  return readSession(env('SESSION_SECRET'), store.get(SESSION_COOKIE)?.value)
}

// toda accion del panel de la asesora pasa por aqui
export async function requireAdvisor(): Promise<Session> {
  const session = await currentSession()
  if (!session || session.role !== 'advisor') throw new Error('No autorizado')
  return session
}

// la asesora entra a cualquier marca; el emprendedor solo a la suya
export async function requireBrandAccess(brandId: string): Promise<Session> {
  const session = await currentSession()
  if (!session) throw new Error('No autorizado')
  if (session.role === 'advisor') return session
  if (session.brandId !== brandId) throw new Error('No autorizado')
  return session
}

// panel del emprendedor: devuelve la marca a la que esta atada la sesion
export async function requireOwnBrand(): Promise<{ session: Session; brandId: string }> {
  const session = await currentSession()
  if (!session || session.role !== 'brand' || !session.brandId) throw new Error('No autorizado')
  return { session, brandId: session.brandId }
}
