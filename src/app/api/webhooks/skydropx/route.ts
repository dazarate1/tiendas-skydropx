import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// el esquema de firma de Skydropx está pendiente de confirmar; se valida HMAC-SHA256
function verify(raw: string, signature: string | null): boolean {
  const secret = process.env.SKYDROPX_WEBHOOK_SECRET
  if (!secret) return true
  if (!signature) return false

  const expected = createHmac('sha256', secret).update(raw).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature.replace(/^sha256=/, ''))
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const raw = await req.text()

  if (!verify(raw, req.headers.get('x-skydropx-signature'))) {
    return NextResponse.json({ error: 'firma inválida' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'json inválido' }, { status: 400 })
  }

  const trackingNumber =
    payload?.data?.tracking_number ?? payload?.tracking_number ?? null
  const eventType = payload?.type ?? payload?.action ?? 'unknown'

  const [order] = trackingNumber
    ? await sql<{ id: string; brand_id: string }[]>`
        select id, brand_id from orders where tracking_number = ${trackingNumber} limit 1`
    : []

  await sql`
    insert into webhook_events (brand_id, event_type, tracking_number, payload)
    values (${order?.brand_id ?? null}, ${eventType}, ${trackingNumber}, ${sql.json(payload)})`

  const status = payload?.data?.status ?? payload?.status
  if (order && status === 'delivered') {
    await sql`update orders set status = 'delivered' where id = ${order.id}`
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
