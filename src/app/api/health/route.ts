import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { checkEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const missing = checkEnv()
  let database = 'ok'
  try {
    await sql`select 1`
  } catch (error) {
    database = (error as Error).message
  }

  const healthy = missing.length === 0 && database === 'ok'
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', database, missingEnv: missing },
    { status: healthy ? 200 : 503 },
  )
}
