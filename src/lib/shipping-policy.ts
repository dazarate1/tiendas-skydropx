import type { Quotation, Rate } from './skydropx/types'

export type ShippingMode = 'cheapest' | 'preferred' | 'flat' | 'free_over' | 'included'

export interface ShippingPolicy {
  shipping_mode: ShippingMode
  shipping_carriers: string[]
  shipping_flat_local_cop: number
  shipping_flat_national_cop: number
  shipping_free_over_cop: number
  shipping_markup_cop: number
}

export interface ShippingOffer {
  chargedCop: number
  quotedCop: number
  rateId: string
  carrier: string
  days: number | null
  free: boolean
  note: string
}

const matchesCarrier = (rate: Rate, wanted: string[]) =>
  wanted.some((name) => rate.carrier.toLowerCase().includes(name.toLowerCase()))

function cheapestOf(rates: Rate[]): Rate | null {
  return rates.reduce<Rate | null>((best, r) => (!best || r.total < best.total ? r : best), null)
}

// el comprador ve un solo precio; la transportadora es decision de la marca
export function applyPolicy(
  policy: ShippingPolicy,
  quotation: Quotation,
  input: { subtotalCop: number; sameCity: boolean },
): ShippingOffer | null {
  const preferred = policy.shipping_carriers.length
    ? quotation.rates.filter((r) => matchesCarrier(r, policy.shipping_carriers))
    : []

  const pick =
    policy.shipping_mode === 'preferred'
      ? cheapestOf(preferred) ?? cheapestOf(quotation.rates)
      : cheapestOf(quotation.rates)

  if (!pick) return null

  const quoted = Math.round(pick.total)
  const markup = Math.max(0, policy.shipping_markup_cop)

  let charged = quoted + markup
  let free = false
  let note = ''

  if (policy.shipping_mode === 'flat') {
    charged = input.sameCity
      ? policy.shipping_flat_local_cop || policy.shipping_flat_national_cop
      : policy.shipping_flat_national_cop
    note = input.sameCity ? 'Tarifa de la ciudad' : 'Tarifa nacional'
  }

  if (policy.shipping_mode === 'free_over' && policy.shipping_free_over_cop > 0) {
    if (input.subtotalCop >= policy.shipping_free_over_cop) {
      charged = 0
      free = true
      note = 'Envío gratis por el monto de tu compra'
    }
  }

  if (policy.shipping_mode === 'included') {
    charged = 0
    free = true
    note = 'Envío incluido en el precio'
  }

  return {
    chargedCop: Math.max(0, Math.round(charged)),
    quotedCop: quoted,
    rateId: pick.id,
    carrier: pick.carrier,
    days: pick.days,
    free,
    note,
  }
}

export function policyLabel(mode: ShippingMode): string {
  const labels: Record<ShippingMode, string> = {
    cheapest: 'La tarifa más económica disponible',
    preferred: 'La más económica entre mis transportadoras',
    flat: 'Tarifa plana que yo defino',
    free_over: 'Envío gratis desde cierto monto',
    included: 'Envío incluido en el precio del producto',
  }
  return labels[mode]
}
