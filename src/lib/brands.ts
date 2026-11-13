import { sql } from './db'
import type { ShippingMode, ShippingPolicy } from './shipping-policy'

export type BrandStatus = 'draft' | 'pending' | 'active' | 'suspended'

export interface BrandPayment {
  pay_transfer_enabled: boolean
  pay_gateway_enabled: boolean
  pay_gateway_provider: string
  pay_bank_name: string
  pay_bank_account: string
  pay_bank_holder: string
  pay_nequi: string
  pay_instructions: string
}

export interface Brand extends ShippingPolicy, BrandPayment {
  id: string
  slug: string
  name: string
  tagline: string
  category: string
  color: string
  whatsapp: string
  status: BrandStatus
  origin_name: string
  origin_street: string
  origin_city: string
  origin_province: string
  origin_zip: string
  origin_phone: string
  advisor_id: string | null
  plan: BrandPlan
  min_recharge_cop: number
  recharge_confirmed_at: Date | null
  activated_at: Date | null
}

export type BrandPlan = 'free' | 'pro'

// el primer mes corre desde la recarga que activa la tienda; despues se renueva cada periodo
export const RECHARGE_PERIOD_DAYS = 30

export function rechargeExpiresAt(brand: {
  plan: BrandPlan
  recharge_confirmed_at: Date | null
}): Date | null {
  if (brand.plan === 'pro' || !brand.recharge_confirmed_at) return null
  const due = new Date(brand.recharge_confirmed_at)
  due.setDate(due.getDate() + RECHARGE_PERIOD_DAYS)
  return due
}

export function rechargeIsCurrent(brand: {
  plan: BrandPlan
  recharge_confirmed_at: Date | null
}): boolean {
  if (brand.plan === 'pro') return true
  const due = rechargeExpiresAt(brand)
  return Boolean(due && due.getTime() > Date.now())
}

export interface BrandListRow extends Brand {
  product_count: number
  order_count: number
  has_credentials: boolean
}

const COLUMNS = sql`
  id, slug, name, tagline, category, color, whatsapp, status,
  origin_name, origin_street, origin_city, origin_province, origin_zip, origin_phone,
  advisor_id, plan, min_recharge_cop, recharge_confirmed_at, activated_at,
  shipping_mode, shipping_carriers, shipping_flat_local_cop, shipping_flat_national_cop,
  shipping_free_over_cop, shipping_markup_cop,
  pay_transfer_enabled, pay_gateway_enabled, pay_gateway_provider,
  pay_bank_name, pay_bank_account, pay_bank_holder, pay_nequi, pay_instructions`

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const [row] = await sql<Brand[]>`select ${COLUMNS} from brands where slug = ${slug} limit 1`
  return row ?? null
}

export async function getBrand(id: string): Promise<Brand | null> {
  const [row] = await sql<Brand[]>`select ${COLUMNS} from brands where id = ${id} limit 1`
  return row ?? null
}

export async function listBrands(): Promise<BrandListRow[]> {
  return sql<BrandListRow[]>`
    select b.*,
           (select count(*)::int from products p where p.brand_id = b.id) as product_count,
           (select count(*)::int from orders o where o.brand_id = b.id) as order_count,
           exists (select 1 from brand_credentials c where c.brand_id = b.id) as has_credentials
      from brands b
     order by b.created_at desc`
}

export async function updateShippingPolicy(
  id: string,
  input: {
    mode: ShippingMode
    carriers: string[]
    flatLocalCop: number
    flatNationalCop: number
    freeOverCop: number
    markupCop: number
  },
) {
  await sql`
    update brands
       set shipping_mode = ${input.mode},
           shipping_carriers = ${input.carriers},
           shipping_flat_local_cop = ${Math.max(0, input.flatLocalCop)},
           shipping_flat_national_cop = ${Math.max(0, input.flatNationalCop)},
           shipping_free_over_cop = ${Math.max(0, input.freeOverCop)},
           shipping_markup_cop = ${Math.max(0, input.markupCop)},
           updated_at = now()
     where id = ${id}`
}

export async function updatePaymentSettings(
  id: string,
  input: {
    transferEnabled: boolean
    gatewayEnabled: boolean
    gatewayProvider: string
    bankName: string
    bankAccount: string
    bankHolder: string
    nequi: string
    instructions: string
  },
) {
  await sql`
    update brands
       set pay_transfer_enabled = ${input.transferEnabled},
           pay_gateway_enabled = ${input.gatewayEnabled},
           pay_gateway_provider = ${input.gatewayProvider},
           pay_bank_name = ${input.bankName},
           pay_bank_account = ${input.bankAccount},
           pay_bank_holder = ${input.bankHolder},
           pay_nequi = ${normalizePhone(input.nequi)},
           pay_instructions = ${input.instructions},
           updated_at = now()
     where id = ${id}`
}

export async function assignAdvisor(brandId: string, advisorId: string | null) {
  await sql`update brands set advisor_id = ${advisorId}, updated_at = now() where id = ${brandId}`
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base || 'marca'
  const taken = await sql<{ slug: string }[]>`
    select slug from brands where slug = ${root} or slug like ${root + '-%'}`
  if (!taken.some((t) => t.slug === root)) return root
  const used = new Set(taken.map((t) => t.slug))
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}-${n}`
    if (!used.has(candidate)) return candidate
  }
  return `${root}-${Date.now()}`
}

export async function createBrand(input: {
  name: string
  tagline: string
  category: string
  color: string
  whatsapp: string
}): Promise<Brand> {
  const slug = await uniqueSlug(slugify(input.name))
  const [row] = await sql<Brand[]>`
    insert into brands (slug, name, tagline, category, color, whatsapp)
    values (${slug}, ${input.name}, ${input.tagline}, ${input.category},
            ${input.color}, ${normalizePhone(input.whatsapp)})
    returning ${COLUMNS}`
  return row
}

export async function updateBrandProfile(
  id: string,
  input: { name: string; tagline: string; color: string; whatsapp: string },
) {
  await sql`
    update brands
       set name = ${input.name}, tagline = ${input.tagline}, color = ${input.color},
           whatsapp = ${normalizePhone(input.whatsapp)}, updated_at = now()
     where id = ${id}`
}

export async function updateOrigin(
  id: string,
  input: {
    name: string
    street: string
    city: string
    province: string
    zip: string
    phone: string
  },
) {
  await sql`
    update brands
       set origin_name = ${input.name}, origin_street = ${input.street},
           origin_city = ${input.city}, origin_province = ${input.province},
           origin_zip = ${input.zip}, origin_phone = ${normalizePhone(input.phone)},
           updated_at = now()
     where id = ${id}`
}

export async function setPlan(id: string, plan: BrandPlan) {
  await sql`update brands set plan = ${plan}, updated_at = now() where id = ${id}`
}

export async function setRechargeConfirmed(id: string, confirmed: boolean) {
  if (confirmed) {
    await sql`update brands set recharge_confirmed_at = now(), updated_at = now() where id = ${id}`
  } else {
    await sql`
      update brands
         set recharge_confirmed_at = null, status = 'draft', activated_at = null, updated_at = now()
       where id = ${id}`
  }
}

// regla de publicación: credenciales, recarga y dirección de origen
export async function publishBlockers(id: string): Promise<string[]> {
  const [row] = await sql<
    {
      has_credentials: boolean
      has_recharge: boolean
      has_origin: boolean
      has_payment: boolean
      has_products: boolean
    }[]
  >`
    select exists (select 1 from brand_credentials c where c.brand_id = b.id) as has_credentials,
           (b.plan = 'pro'
             or b.recharge_confirmed_at > now() - make_interval(days => ${RECHARGE_PERIOD_DAYS})) as has_recharge,
           (b.origin_zip <> '' and b.origin_street <> '') as has_origin,
           ((b.pay_transfer_enabled and (b.pay_bank_account <> '' or b.pay_nequi <> ''))
             or b.pay_gateway_enabled) as has_payment,
           exists (select 1 from products p where p.brand_id = b.id and p.active) as has_products
      from brands b where b.id = ${id}`
  if (!row) return ['La marca no existe']
  const blockers: string[] = []
  if (!row.has_credentials) blockers.push('Cuenta Skydropx sin conectar')
  if (!row.has_recharge) blockers.push('Recarga del periodo sin confirmar')
  if (!row.has_origin) blockers.push('Dirección de origen incompleta')
  if (!row.has_payment) blockers.push('Sin forma de cobro configurada')
  if (!row.has_products) blockers.push('Sin productos publicados')
  return blockers
}

export async function setPublished(id: string, published: boolean) {
  if (published) {
    await sql`update brands set status = 'active', activated_at = now(), updated_at = now() where id = ${id}`
  } else {
    await sql`update brands set status = 'draft', activated_at = null, updated_at = now() where id = ${id}`
  }
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

// números colombianos de 10 dígitos reciben el prefijo 57
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`
  return digits
}
