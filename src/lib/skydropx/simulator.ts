import type { Parcel, Quotation, Rate, Shipment, Tracking } from './types'

// zonas por los dos primeros dígitos del código postal
const COASTAL = new Set(['08', '13', '47', '20', '70', '23', '54'])
const SPECIAL = new Set(['88', '91'])

const ZONE_BASE = { local: 7400, nac1: 11200, nac2: 14300, esp: 23800 }

const CARRIERS = [
  { name: 'Interrapidísimo', factor: 0.92, days: 3, service: 'Estándar' },
  { name: 'Servientrega', factor: 1.0, days: 2, service: 'Estándar' },
  { name: 'Coordinadora', factor: 1.09, days: 2, service: 'Estándar' },
  { name: 'Envía', factor: 0.96, days: 4, service: 'Estándar' },
]

function zoneOf(zipFrom: string, zipTo: string): keyof typeof ZONE_BASE {
  const from = zipFrom.slice(0, 2)
  const to = zipTo.slice(0, 2)
  if (SPECIAL.has(to)) return 'esp'
  if (from === to) return 'local'
  if (COASTAL.has(to)) return 'nac2'
  return 'nac1'
}

export function simulateQuote(zipFrom: string, zipTo: string, parcel: Parcel): Quotation {
  const base = ZONE_BASE[zoneOf(zipFrom, zipTo)]
  const extraKg = Math.max(0, Math.ceil(parcel.weight) - 1)
  const rates: Rate[] = CARRIERS.map((c, i) => ({
    id: `sim-rate-${i}`,
    carrier: c.name,
    service: c.service,
    total: Math.round((base * c.factor + extraKg * 2600) / 100) * 100,
    currency: 'COP',
    days: c.days,
  })).sort((a, b) => a.total - b.total)

  return { id: `sim-quote-${Date.now()}`, rates }
}

export function simulateShipment(carrier: string | null): Shipment {
  const tracking = String(Math.floor(2e11 + Math.random() * 7e11))
  return {
    id: `sim-shipment-${tracking}`,
    trackingNumber: tracking,
    labelUrl: null,
    carrier: carrier ?? CARRIERS[0].name,
    status: 'created',
  }
}

export function simulateTracking(trackingNumber: string, carrier: string | null): Tracking {
  return {
    trackingNumber,
    carrier,
    status: 'in_transit',
    events: [
      {
        status: 'created',
        description: 'Guía generada (simulada)',
        location: null,
        occurredAt: new Date().toISOString(),
      },
    ],
  }
}
