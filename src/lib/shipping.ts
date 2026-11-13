import { sql } from './db'
import { findCity } from './cities'
import { SkydropxClient } from './skydropx/client'
import { simulateQuote, simulateShipment } from './skydropx/simulator'
import type { Address, Parcel, Quotation, Shipment } from './skydropx/types'

export function demoMode(): boolean {
  return process.env.DEMO_MODE === '1'
}

export async function hasCredentials(brandId: string): Promise<boolean> {
  const [row] = await sql<{ ok: boolean }[]>`
    select exists (select 1 from brand_credentials where brand_id = ${brandId}) as ok`
  return row?.ok ?? false
}

// sin credenciales y en modo demostración, las tarifas se simulan
export async function useSimulator(brandId: string): Promise<boolean> {
  if (!demoMode()) return false
  return !(await hasCredentials(brandId))
}

export function parcelFor(weightGrams: number): Parcel {
  return { weight: Math.max(1, Math.ceil(weightGrams / 1000)), height: 20, width: 20, length: 20 }
}

export async function quoteFor(
  brandId: string,
  from: Address,
  to: Address,
  parcel: Parcel,
  declaredAmount: number,
): Promise<{ quotation: Quotation; simulated: boolean }> {
  if (await useSimulator(brandId)) {
    return { quotation: simulateQuote(from.zip, to.zip, parcel), simulated: true }
  }
  const client = await SkydropxClient.forBrand(brandId)
  return { quotation: await client.quote({ from, to, parcel, declaredAmount }), simulated: false }
}

// dirección de origen de la marca en el formato que espera la API
export function originAddress(b: {
  name: string
  whatsapp: string
  origin_name: string
  origin_street: string
  origin_city: string
  origin_province: string
  origin_zip: string
  origin_phone: string
}): Address {
  return {
    name: b.origin_name || b.name,
    street1: b.origin_street,
    city: b.origin_city,
    province: findCity(b.origin_city)?.province ?? b.origin_province,
    zip: findCity(b.origin_city)?.zip ?? b.origin_zip,
    phone: b.origin_phone || b.whatsapp,
  }
}

export async function shipmentFor(
  brandId: string,
  input: {
    quotationId: string
    rateId: string
    carrier: string | null
    addressFrom: Address
    addressTo: Address
    parcel: Parcel
    declaredAmount: number
    reference: string
  },
): Promise<{ shipment: Shipment; simulated: boolean }> {
  if (await useSimulator(brandId)) {
    return { shipment: simulateShipment(input.carrier), simulated: true }
  }
  const client = await SkydropxClient.forBrand(brandId)
  const shipment = await client.createShipment({
    quotationId: input.quotationId,
    rateId: input.rateId,
    addressFrom: input.addressFrom,
    addressTo: input.addressTo,
    parcel: input.parcel,
    declaredAmount: input.declaredAmount,
    reference: input.reference,
  })
  return { shipment, simulated: false }
}
