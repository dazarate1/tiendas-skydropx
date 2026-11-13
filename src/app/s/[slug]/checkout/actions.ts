'use server'

import { getBrandBySlug, rechargeIsCurrent } from '@/lib/brands'
import { listProducts } from '@/lib/products'
import { createOrder, submitPaymentProof } from '@/lib/orders'
import { findCity } from '@/lib/cities'
import { readOffer, signOffer } from '@/lib/offer'
import { applyPolicy } from '@/lib/shipping-policy'
import { originAddress, parcelFor, quoteFor } from '@/lib/shipping'
import type { PaymentMethod } from '@/lib/orders'
import type { SkydropxError } from '@/lib/skydropx/types'

interface CartLine {
  productId: string
  quantity: number
}

export interface ShippingQuote {
  ok: boolean
  error?: string
  token?: string
  shippingCop?: number
  subtotalCop?: number
  totalCop?: number
  days?: number | null
  free?: boolean
  note?: string
  simulated?: boolean
}

export interface PaymentOption {
  method: PaymentMethod
  label: string
  detail: string
}

const MAX_LINES = 30
const MAX_QTY = 50
const MAX_TEXT = 200

function clean(value: unknown, max = MAX_TEXT): string {
  return String(value ?? '').trim().slice(0, max)
}

async function resolveCart(brandId: string, lines: CartLine[]) {
  const products = await listProducts(brandId, true)
  const resolved = lines
    .slice(0, MAX_LINES)
    .map((line) => {
      const product = products.find((p) => p.id === line.productId)
      if (!product) return null
      const quantity = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(line.quantity) || 1)))
      return { product, quantity }
    })
    .filter((l): l is { product: (typeof products)[number]; quantity: number } => l !== null)

  const subtotal = resolved.reduce((s, l) => s + l.product.price_cop * l.quantity, 0)
  const weight = resolved.reduce((s, l) => s + l.product.weight_grams * l.quantity, 0)
  return { lines: resolved, subtotal, weight }
}

export async function quoteShipping(
  slug: string,
  cityName: string,
  lines: CartLine[],
): Promise<ShippingQuote> {
  const brand = await getBrandBySlug(slug)
  if (!brand || brand.status !== 'active' || !rechargeIsCurrent(brand)) {
    return { ok: false, error: 'Tienda no disponible' }
  }

  const city = findCity(cityName)
  if (!city) return { ok: false, error: 'Selecciona una ciudad de la lista' }
  if (!brand.origin_zip) return { ok: false, error: 'La tienda no tiene dirección de origen' }

  const cart = await resolveCart(brand.id, lines)
  if (!cart.lines.length) return { ok: false, error: 'El carrito está vacío' }

  try {
    const { quotation, simulated } = await quoteFor(
      brand.id,
      originAddress(brand),
      {
        name: 'Cliente',
        street1: 'Por confirmar',
        city: city.name,
        province: city.province,
        zip: city.zip,
        phone: '3000000000',
      },
      parcelFor(cart.weight),
      cart.subtotal,
    )
    if (!quotation.rates.length) return { ok: false, error: 'No hay envíos disponibles a esta ciudad' }

    const offer = applyPolicy(brand, quotation, {
      subtotalCop: cart.subtotal,
      sameCity: city.name === brand.origin_city,
    })
    if (!offer) return { ok: false, error: 'No hay envíos disponibles a esta ciudad' }

    const token = await signOffer({
      brandId: brand.id,
      quotationId: quotation.id,
      rateId: offer.rateId,
      carrier: offer.carrier,
      chargedCop: offer.chargedCop,
      quotedCop: offer.quotedCop,
      subtotalCop: cart.subtotal,
      weightGrams: cart.weight,
      city: city.name,
    })

    return {
      ok: true,
      token,
      shippingCop: offer.chargedCop,
      subtotalCop: cart.subtotal,
      totalCop: cart.subtotal + offer.chargedCop,
      days: offer.days,
      free: offer.free,
      note: offer.note,
      simulated,
    }
  } catch (error) {
    const e = error as SkydropxError
    console.error('quoteShipping', slug, e.message, e.body ?? '')
    return { ok: false, error: 'No se pudo calcular el envío en este momento' }
  }
}

export async function paymentOptions(slug: string): Promise<PaymentOption[]> {
  const brand = await getBrandBySlug(slug)
  if (!brand) return []

  const options: PaymentOption[] = []
  if (brand.pay_transfer_enabled && (brand.pay_bank_account || brand.pay_nequi)) {
    const targets = [
      brand.pay_nequi ? `Nequi ${brand.pay_nequi}` : '',
      brand.pay_bank_account ? `${brand.pay_bank_name} ${brand.pay_bank_account}` : '',
    ].filter(Boolean)
    options.push({
      method: 'transfer',
      label: 'Transferencia',
      detail: [targets.join(' · '), brand.pay_bank_holder, brand.pay_instructions]
        .filter(Boolean)
        .join(' — '),
    })
  }
  if (brand.pay_gateway_enabled) {
    options.push({
      method: 'gateway',
      label: 'Pago en línea',
      detail: 'Pagas con tarjeta o PSE y el pedido se confirma al instante.',
    })
  }
  return options
}

export async function placeOrder(
  slug: string,
  input: {
    customerName: string
    customerPhone: string
    city: string
    address: string
    token: string
    paymentMethod: PaymentMethod
    lines: CartLine[]
  },
): Promise<{ ok: boolean; error?: string; code?: string; orderId?: string; whatsapp?: string; message?: string }> {
  const brand = await getBrandBySlug(slug)
  if (!brand || brand.status !== 'active' || !rechargeIsCurrent(brand)) {
    return { ok: false, error: 'Tienda no disponible' }
  }

  const customerName = clean(input.customerName, 120)
  const address = clean(input.address, 240)
  const customerPhone = clean(input.customerPhone, 20).replace(/\D/g, '')
  const city = findCity(clean(input.city, 60))

  if (!customerName) return { ok: false, error: 'Falta el nombre' }
  if (!address) return { ok: false, error: 'Falta la dirección' }
  if (!city) return { ok: false, error: 'Ciudad inválida' }

  // el costo del envio viene firmado por el servidor, no del navegador
  const offer = await readOffer(input.token)
  if (!offer || offer.brandId !== brand.id || offer.city !== city.name) {
    return { ok: false, error: 'El cálculo del envío venció. Vuelve a confirmar la ciudad.' }
  }

  const cart = await resolveCart(brand.id, input.lines)
  if (!cart.lines.length) return { ok: false, error: 'El carrito está vacío' }
  if (cart.subtotal !== offer.subtotalCop) {
    return { ok: false, error: 'El carrito cambió. Vuelve a calcular el envío.' }
  }

  const allowed = await paymentOptions(slug)
  const paymentMethod = allowed.find((o) => o.method === input.paymentMethod)?.method
  if (!paymentMethod) return { ok: false, error: 'Selecciona una forma de pago' }

  const order = await createOrder({
    brandId: brand.id,
    customerName,
    customerPhone,
    city: city.name,
    zip: city.zip,
    address,
    subtotalCop: cart.subtotal,
    shippingCop: offer.chargedCop,
    shippingQuotedCop: offer.quotedCop,
    weightGrams: cart.weight,
    carrier: offer.carrier,
    rateId: offer.rateId,
    quotationId: offer.quotationId,
    paymentMethod,
    items: cart.lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      unitPriceCop: l.product.price_cop,
      weightGrams: l.product.weight_grams,
      quantity: l.quantity,
    })),
  })

  const money = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

  const body = [
    `Pedido ${order.code} — ${brand.name}`,
    '',
    ...cart.lines.map((l) => `• ${l.quantity} × ${l.product.name} — ${money(l.product.price_cop * l.quantity)}`),
    '',
    `Subtotal: ${money(cart.subtotal)}`,
    `Envío: ${offer.chargedCop === 0 ? 'incluido' : money(offer.chargedCop)}`,
    `Total: ${money(cart.subtotal + offer.chargedCop)}`,
    '',
    `Nombre: ${customerName}`,
    `Ciudad: ${city.name}`,
    `Dirección: ${address}`,
    '',
    paymentMethod === 'transfer'
      ? 'Voy a pagar por transferencia y les envío el comprobante.'
      : 'Voy a pagar en línea.',
  ].join('\n')

  return {
    ok: true,
    code: order.code,
    orderId: order.id,
    message: body,
    whatsapp: `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(body)}`,
  }
}

export async function declarePayment(
  orderId: string,
  input: { reference: string; note: string },
): Promise<{ ok: boolean }> {
  await submitPaymentProof(orderId, {
    reference: clean(input.reference, 120),
    note: clean(input.note, 300),
    proofUrl: null,
  })
  return { ok: true }
}
