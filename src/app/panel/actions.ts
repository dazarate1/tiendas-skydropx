'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { requireBrandAccess } from '@/lib/auth'
import { getBrand, updateBrandProfile, updateOrigin, updatePaymentSettings, updateShippingPolicy } from '@/lib/brands'
import { createProduct, deleteProduct, updateProduct } from '@/lib/products'
import { findCity } from '@/lib/cities'
import { generateLabel } from '@/lib/labels'
import { originAddress } from '@/lib/shipping'
import { setOrderStatus, setPaymentStatus } from '@/lib/orders'
import { SkydropxClient } from '@/lib/skydropx/client'
import type { PaymentStatus } from '@/lib/orders'
import type { ShippingMode } from '@/lib/shipping-policy'
import type { Environment, SkydropxError } from '@/lib/skydropx/types'

const text = (form: FormData, key: string, max = 200) =>
  String(form.get(key) ?? '').trim().slice(0, max)
const digits = (form: FormData, key: string) => Number(text(form, key).replace(/\D/g, '')) || 0
const checked = (form: FormData, key: string) => form.get(key) === 'on' || form.get(key) === 'true'

function touch(brandId: string) {
  revalidatePath('/panel')
  revalidatePath(`/admin/marcas/${brandId}`)
}

/* perfil y origen */
export async function actionUpdateProfile(form: FormData) {
  const brandId = text(form, 'brandId', 40)
  await requireBrandAccess(brandId)
  await updateBrandProfile(brandId, {
    name: text(form, 'name', 80),
    tagline: text(form, 'tagline', 120),
    color: text(form, 'color', 20) || 'ciruela',
    whatsapp: text(form, 'whatsapp', 20),
  })
  touch(brandId)
}

export async function actionUpdateOrigin(form: FormData) {
  const brandId = text(form, 'brandId', 40)
  await requireBrandAccess(brandId)
  const cityName = text(form, 'city', 60)
  const city = findCity(cityName)
  await updateOrigin(brandId, {
    name: text(form, 'name', 80),
    street: text(form, 'street', 160),
    city: cityName,
    province: city?.province ?? text(form, 'province', 60),
    zip: city?.zip ?? text(form, 'zip', 10).replace(/\D/g, ''),
    phone: text(form, 'phone', 20),
  })
  touch(brandId)
}

/* politica de envio */
export async function actionUpdateShipping(form: FormData) {
  const brandId = text(form, 'brandId', 40)
  await requireBrandAccess(brandId)
  const mode = text(form, 'mode', 20) as ShippingMode
  await updateShippingPolicy(brandId, {
    mode,
    carriers: text(form, 'carriers', 200)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 8),
    flatLocalCop: digits(form, 'flatLocal'),
    flatNationalCop: digits(form, 'flatNational'),
    freeOverCop: digits(form, 'freeOver'),
    markupCop: digits(form, 'markup'),
  })
  touch(brandId)
}

/* formas de cobro */
export async function actionUpdatePayments(form: FormData) {
  const brandId = text(form, 'brandId', 40)
  await requireBrandAccess(brandId)
  await updatePaymentSettings(brandId, {
    transferEnabled: checked(form, 'transfer'),
    gatewayEnabled: checked(form, 'gateway'),
    gatewayProvider: text(form, 'gatewayProvider', 40),
    bankName: text(form, 'bankName', 60),
    bankAccount: text(form, 'bankAccount', 40),
    bankHolder: text(form, 'bankHolder', 120),
    nequi: text(form, 'nequi', 20),
    instructions: text(form, 'instructions', 300),
  })
  touch(brandId)
}

/* credenciales skydropx */
export async function actionConnectCredentials(form: FormData) {
  const brandId = text(form, 'brandId', 40)
  await requireBrandAccess(brandId)
  const clientId = text(form, 'clientId', 200)
  const clientSecret = text(form, 'clientSecret', 200)
  const environment = (text(form, 'environment', 12) === 'production' ? 'production' : 'sandbox') as Environment

  if (!clientId || !clientSecret) return { ok: false, error: 'Faltan credenciales' }

  const client = await SkydropxClient.withCredentials(brandId, { clientId, clientSecret, environment })
  try {
    await client.verifyConnection()
  } catch (error) {
    return { ok: false, error: `Skydropx no aceptó las credenciales: ${(error as Error).message}` }
  }

  await sql`
    insert into brand_credentials (brand_id, client_id_enc, client_secret_enc, environment,
                                   connected_at, last_verified_at)
    values (${brandId}, ${encrypt(clientId)}, ${encrypt(clientSecret)}, ${environment}, now(), now())
    on conflict (brand_id) do update
      set client_id_enc = excluded.client_id_enc,
          client_secret_enc = excluded.client_secret_enc,
          environment = excluded.environment,
          connected_at = now(), last_verified_at = now(), last_error = null`
  await sql`delete from brand_tokens where brand_id = ${brandId}`

  touch(brandId)
  return { ok: true }
}

export async function actionTestQuote(brandId: string) {
  await requireBrandAccess(brandId)
  const brand = await getBrand(brandId)
  if (!brand?.origin_city) return { ok: false, error: 'La marca no tiene dirección de origen completa' }
  try {
    const client = await SkydropxClient.forBrand(brandId)
    const to = findCity('Medellín')!
    const q = await client.quote({
      from: originAddress(brand),
      to: { name: 'Prueba', street1: 'Calle 100 # 10-20', city: to.name, province: to.province, zip: to.zip, phone: '3000000000' },
      parcel: { weight: 1, height: 20, width: 20, length: 20 },
      declaredAmount: 50000,
    })
    return { ok: true, rates: q.rates, raw: JSON.stringify(client.lastResponse).slice(0, 1500) }
  } catch (error) {
    const e = error as SkydropxError
    return { ok: false, error: `${e.message}${e.status ? ' (' + e.status + ')' : ''}`, raw: JSON.stringify(e.body ?? null).slice(0, 1500) }
  }
}

export async function actionCheckCredits(brandId: string) {
  await requireBrandAccess(brandId)
  try {
    const client = await SkydropxClient.forBrand(brandId)
    const credits = await client.credits()
    return { ok: true, balance: credits.balance, currency: credits.currency }
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }
}

/* productos */
export async function actionSaveProduct(form: FormData) {
  const brandId = text(form, 'brandId', 40)
  await requireBrandAccess(brandId)
  const id = text(form, 'id', 40)
  const imageUrl = text(form, 'imageUrl', 500)
  const input = {
    name: text(form, 'name', 80),
    description: text(form, 'description', 200),
    priceCop: digits(form, 'price'),
    weightGrams: digits(form, 'weight') || 300,
    imageUrl: /^https?:\/\//.test(imageUrl) ? imageUrl : null,
  }
  if (!input.name || !input.priceCop) return

  if (id) await updateProduct(id, brandId, input)
  else await createProduct(brandId, input)

  touch(brandId)
}

export async function actionDeleteProduct(brandId: string, productId: string) {
  await requireBrandAccess(brandId)
  await deleteProduct(productId, brandId)
  touch(brandId)
}

/* pagos y guias */
export async function actionSetPaymentStatus(brandId: string, orderId: string, status: PaymentStatus) {
  const session = await requireBrandAccess(brandId)
  await setPaymentStatus(orderId, brandId, status, session.accountId)
  touch(brandId)
}

export async function actionGenerateLabel(brandId: string, orderId: string) {
  await requireBrandAccess(brandId)
  const result = await generateLabel(orderId, brandId)
  touch(brandId)
  return result
}

export async function actionCancelOrder(brandId: string, orderId: string) {
  await requireBrandAccess(brandId)
  await setOrderStatus(orderId, 'cancelled')
  touch(brandId)
}
