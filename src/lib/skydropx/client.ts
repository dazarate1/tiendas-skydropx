import { sql } from '@/lib/db'
import { decrypt, encrypt } from '@/lib/crypto'
import { acquire } from './rate-limit'
import {
  Address,
  Credits,
  Environment,
  InsufficientCreditsError,
  Quotation,
  QuoteInput,
  Rate,
  Shipment,
  ShipmentRequest,
  SkydropxError,
  Tracking,
} from './types'

const BASE_URL: Record<Environment, string> = {
  sandbox: 'https://sb-pro.skydropx.com/api/v1',
  production: 'https://pro.skydropx.com/api/v1',
}

// el token vive 2 horas; se renueva con 5 minutos de margen
const TOKEN_MARGIN_MS = 5 * 60 * 1000

// las transportadoras responden en segundos; sondeo acotado
const QUOTE_POLL_ATTEMPTS = 8
const QUOTE_POLL_DELAY_MS = 1200

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Credentials {
  clientId: string
  clientSecret: string
  environment: Environment
}

async function loadCredentials(brandId: string): Promise<Credentials> {
  const [row] = await sql<
    { client_id_enc: string; client_secret_enc: string; environment: Environment }[]
  >`select client_id_enc, client_secret_enc, environment
      from brand_credentials where brand_id = ${brandId}`

  if (!row) throw new Error('La marca no tiene credenciales de Skydropx conectadas')

  return {
    clientId: decrypt(row.client_id_enc),
    clientSecret: decrypt(row.client_secret_enc),
    environment: row.environment,
  }
}

async function cachedToken(brandId: string): Promise<string | null> {
  const [row] = await sql<{ access_token_enc: string; expires_at: Date }[]>`
    select access_token_enc, expires_at from brand_tokens where brand_id = ${brandId}`

  if (!row) return null
  if (row.expires_at.getTime() - TOKEN_MARGIN_MS <= Date.now()) return null
  return decrypt(row.access_token_enc)
}

async function storeToken(brandId: string, token: string, expiresIn: number) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  await sql`
    insert into brand_tokens (brand_id, access_token_enc, expires_at)
    values (${brandId}, ${encrypt(token)}, ${expiresAt})
    on conflict (brand_id) do update
      set access_token_enc = excluded.access_token_enc,
          expires_at = excluded.expires_at`
}

export class SkydropxClient {
  lastResponse: unknown = null

  private constructor(
    private readonly brandId: string,
    private readonly credentials: Credentials,
  ) {}

  static async forBrand(brandId: string): Promise<SkydropxClient> {
    return new SkydropxClient(brandId, await loadCredentials(brandId))
  }

  static async withCredentials(
    brandId: string,
    credentials: Credentials,
  ): Promise<SkydropxClient> {
    return new SkydropxClient(brandId, credentials)
  }

  private get baseUrl() {
    return BASE_URL[this.credentials.environment]
  }

  private async token(): Promise<string> {
    const cached = await cachedToken(this.brandId)
    if (cached) return cached

    await acquire(this.brandId)
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      }),
    })

    const body = await res.json().catch(() => null)
    if (!res.ok) throw new SkydropxError('No se pudo obtener el token', res.status, body)

    const token = body?.access_token as string
    const expiresIn = (body?.expires_in as number) ?? 7200
    await storeToken(this.brandId, token, expiresIn)
    return token
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    await acquire(this.brandId)
    const token = await this.token()

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    })

    const text = await res.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = { raw: text.slice(0, 500) }
    }
    this.lastResponse = body

    if (!res.ok) {
      if (res.status === 422 && JSON.stringify(body ?? '').match(/credit|saldo|balance/i)) {
        throw new InsufficientCreditsError(body)
      }
      throw new SkydropxError(`Skydropx respondió ${res.status} en ${path}`, res.status, body)
    }

    return body as T
  }

  async verifyConnection(): Promise<boolean> {
    await this.token()
    return true
  }

  // la cotización es asíncrona: se crea y luego se consulta hasta que complete
  async quote(input: QuoteInput): Promise<Quotation> {
    const parcel = {
      weight: Number(input.parcel.weight),
      length: Number(input.parcel.length),
      width: Number(input.parcel.width),
      height: Number(input.parcel.height),
    }
    const payload = {
      address_from: toApiAddress(input.from),
      address_to: toApiAddress(input.to),
      parcel,
      parcels: [parcel],
      declared_amount: Math.max(1, Math.round(input.declaredAmount)),
      ...(input.carriers ? { carriers: input.carriers } : {}),
    }

    const created = await this.request<any>('/quotations', {
      method: 'POST',
      body: JSON.stringify({ ...payload, quotation: payload }),
    })

    let raw = created?.data ?? created
    const id = String(raw?.id ?? '')

    for (let i = 0; i < QUOTE_POLL_ATTEMPTS && id && !raw?.is_completed; i++) {
      await sleep(QUOTE_POLL_DELAY_MS)
      const got = await this.request<any>(`/quotations/${encodeURIComponent(id)}`)
      raw = got?.data ?? got
      if (!raw?.is_completed && (raw?.rates ?? []).some((r: any) => r?.total != null)) break
    }

    const list: any[] = raw?.attributes?.rates ?? raw?.rates ?? []
    const rates: Rate[] = list
      .filter((r: any) => r && r.success !== false && r.total != null && r.status !== 'pending')
      .map((r: any) => ({
        id: String(r.id ?? r.rate_id ?? ''),
        carrier: r.provider_display_name ?? r.provider_name ?? r.provider ?? 'desconocido',
        service: r.provider_service_name ?? r.service_level_name ?? '',
        total: Number(r.total ?? r.amount ?? 0),
        currency: r.currency_code ?? r.currency ?? 'COP',
        days: r.days != null ? Number(r.days) : null,
      }))
      .filter((r) => r.total > 0)

    return { id, rates: rates.sort((a, b) => a.total - b.total) }
  }

  async createShipment(input: ShipmentRequest): Promise<Shipment> {
    const body = await this.request<any>('/shipments', {
      method: 'POST',
      body: JSON.stringify({
        shipment: {
          quotation_id: input.quotationId,
          rate_id: input.rateId,
          address_from: toApiAddress(input.addressFrom),
          address_to: toApiAddress(input.addressTo),
          parcel: input.parcel,
          parcels: [input.parcel],
          declared_amount: Math.max(1, Math.round(input.declaredAmount ?? 1)),
          ...(input.reference ? { reference: input.reference } : {}),
        },
      }),
    })

    const raw = body?.data ?? body
    const attrs = raw?.attributes ?? raw
    return {
      id: String(raw?.id ?? ''),
      trackingNumber: attrs?.tracking_number ?? null,
      labelUrl: attrs?.label_url ?? attrs?.label?.url ?? null,
      carrier: attrs?.provider ?? attrs?.carrier ?? null,
      status: attrs?.status ?? 'created',
    }
  }

  async track(trackingNumber: string): Promise<Tracking> {
    const body = await this.request<any>(
      `/shipments/tracking/${encodeURIComponent(trackingNumber)}`,
    )
    const raw = body?.data ?? body
    const attrs = raw?.attributes ?? raw
    return {
      trackingNumber,
      carrier: attrs?.carrier ?? attrs?.provider ?? null,
      status: attrs?.status ?? 'unknown',
      events: (attrs?.events ?? []).map((e: any) => ({
        status: e.status ?? '',
        description: e.description ?? e.message ?? '',
        location: e.location ?? null,
        occurredAt: e.occurred_at ?? e.created_at ?? '',
      })),
    }
  }

  async cancelShipment(shipmentId: string, reason: string): Promise<void> {
    await this.request(`/shipments/${encodeURIComponent(shipmentId)}/cancellations`, {
      method: 'POST',
      body: JSON.stringify({ cancellation: { reason } }),
    })
  }

  // alcance por verificar en cuentas de Colombia
  async credits(): Promise<Credits> {
    const body = await this.request<any>('/finance/credits')
    const raw = body?.data ?? body
    const attrs = raw?.attributes ?? raw
    return {
      balance: Number(attrs?.balance ?? attrs?.credits ?? 0),
      currency: attrs?.currency ?? 'COP',
    }
  }

  async carrierServices(): Promise<unknown> {
    return this.request('/shipments/carrier_services')
  }
}

// esquema Pro: area_level1 = departamento, area_level2 = ciudad, area_level3 = barrio
function toApiAddress(a: Address) {
  return {
    country_code: a.country ?? 'CO',
    postal_code: a.zip,
    area_level1: a.province,
    area_level2: a.city,
    area_level3: a.neighborhood ?? '',
    street1: a.street1,
    name: a.name,
    phone: a.phone.replace(/\D/g, ''),
    email: a.email || 'pedidos@tienda.local',
    reference: a.reference ?? '',
  }
}
