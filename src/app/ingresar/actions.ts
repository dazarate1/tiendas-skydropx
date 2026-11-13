'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authenticate, bootstrapAdvisor } from '@/lib/accounts'
import { env } from '@/lib/env'
import { SESSION_COOKIE, SESSION_TTL_MS, createSessionToken } from '@/lib/session'

export async function actionLogin(form: FormData) {
  const email = String(form.get('email') ?? '').trim().slice(0, 160)
  const password = String(form.get('password') ?? '').slice(0, 200)
  if (!email || !password) redirect('/ingresar?error=1')

  // primer acceso: la asesora se siembra desde variables de entorno
  await bootstrapAdvisor(process.env.ADMIN_EMAIL ?? '', process.env.ADMIN_PASSWORD ?? '')

  const account = await authenticate(email, password)
  if (!account) redirect('/ingresar?error=1')

  const store = await cookies()
  store.set(
    SESSION_COOKIE,
    await createSessionToken(env('SESSION_SECRET'), {
      accountId: account.id,
      role: account.role,
      brandId: account.brand_id,
    }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_MS / 1000,
    },
  )

  redirect(account.role === 'advisor' ? '/admin' : '/panel')
}

export async function actionLogout() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect('/ingresar')
}
