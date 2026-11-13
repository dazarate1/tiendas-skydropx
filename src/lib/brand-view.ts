import { rechargeExpiresAt, rechargeIsCurrent, type Brand } from './brands'
import type { Order } from './orders'
import type { Product } from './products'
import type { BrandView, OrderView, ProductView } from '@/components/BrandDetail'
import type { ShippingMode } from './shipping-policy'

export function toBrandView(brand: Brand): BrandView {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    tagline: brand.tagline,
    color: brand.color,
    whatsapp: brand.whatsapp,
    status: brand.status,
    plan: brand.plan,
    minRechargeCop: brand.min_recharge_cop,
    rechargeConfirmed: rechargeIsCurrent(brand),
    rechargeExpiresAt: rechargeExpiresAt(brand)?.toISOString() ?? null,
    origin: {
      name: brand.origin_name,
      street: brand.origin_street,
      city: brand.origin_city,
      province: brand.origin_province,
      zip: brand.origin_zip,
      phone: brand.origin_phone,
    },
    shipping: {
      mode: brand.shipping_mode as ShippingMode,
      carriers: brand.shipping_carriers ?? [],
      flatLocalCop: brand.shipping_flat_local_cop,
      flatNationalCop: brand.shipping_flat_national_cop,
      freeOverCop: brand.shipping_free_over_cop,
      markupCop: brand.shipping_markup_cop,
    },
    payments: {
      transfer: brand.pay_transfer_enabled,
      gateway: brand.pay_gateway_enabled,
      gatewayProvider: brand.pay_gateway_provider,
      bankName: brand.pay_bank_name,
      bankAccount: brand.pay_bank_account,
      bankHolder: brand.pay_bank_holder,
      nequi: brand.pay_nequi,
      instructions: brand.pay_instructions,
    },
  }
}

export function toProductView(p: Product): ProductView {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price_cop: p.price_cop,
    weight_grams: p.weight_grams,
    image_url: p.image_url,
  }
}

export function toOrderView(o: Order): OrderView {
  return {
    id: o.id,
    code: o.code,
    customer_name: o.customer_name,
    city: o.city,
    address: o.address,
    subtotal_cop: o.subtotal_cop,
    shipping_cop: o.shipping_cop,
    shipping_quoted_cop: o.shipping_quoted_cop,
    total_cop: o.subtotal_cop + o.shipping_cop,
    carrier: o.carrier,
    status: o.status,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    payment_reference: o.payment_reference,
    tracking_number: o.tracking_number,
    label_url: o.label_url,
    label_error: o.label_error,
    created_at: o.created_at.toISOString(),
  }
}
