import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, readSession } from '@/lib/session'

const RESERVED = new Set(['www', 'admin', 'api', 'app', 'panel'])

export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|public).*)'],
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const guarded = pathname.startsWith('/admin') || pathname.startsWith('/panel')
  if (guarded) {
    const session = await readSession(
      process.env.SESSION_SECRET ?? '',
      req.cookies.get(SESSION_COOKIE)?.value,
    )
    if (!session) return redirectTo(req, '/ingresar')

    // cada rol entra solo a su superficie
    if (pathname.startsWith('/admin') && session.role !== 'advisor') {
      return redirectTo(req, '/panel')
    }
    if (pathname.startsWith('/panel') && session.role !== 'brand') {
      return redirectTo(req, '/admin')
    }
    return NextResponse.next()
  }

  const host = (req.headers.get('host') ?? '').split(':')[0]
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost').split(':')[0]
  const slug = extractSlug(host, root)
  if (!slug) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = `/s/${slug}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  return NextResponse.redirect(url)
}

function extractSlug(host: string, root: string): string | null {
  if (!host || host === root) return null
  if (!host.endsWith(`.${root}`)) return null
  const sub = host.slice(0, -(root.length + 1))
  if (!sub || sub.includes('.') || RESERVED.has(sub)) return null
  return sub
}
