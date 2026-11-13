export type Environment = 'sandbox' | 'production'

export interface Parcel {
  weight: number
  height: number
  width: number
  length: number
}

export interface QuoteInput {
  from: Address
  to: Address
  parcel: Parcel
  declaredAmount: number
  carriers?: string[]
}

export interface Rate {
  id: string
  carrier: string
  service: string
  total: number
  currency: string
  days: number | null
}

export interface Quotation {
  id: string
  rates: Rate[]
}

export interface Address {
  name: string
  street1: string
  city: string
  province: string
  zip: string
  phone: string
  email?: string
  neighborhood?: string
  reference?: string
  country?: string
}

export interface ShipmentRequest {
  quotationId: string
  rateId: string
  addressFrom: Address
  addressTo: Address
  parcel: Parcel
  declaredAmount?: number
  reference?: string
}

export interface Shipment {
  id: string
  trackingNumber: string | null
  labelUrl: string | null
  carrier: string | null
  status: string
}

export interface TrackingEvent {
  status: string
  description: string
  location: string | null
  occurredAt: string
}

export interface Tracking {
  trackingNumber: string
  carrier: string | null
  status: string
  events: TrackingEvent[]
}

export interface Credits {
  balance: number
  currency: string
}

export class SkydropxError extends Error {
  readonly status: number
  readonly body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'SkydropxError'
    this.status = status
    this.body = body
  }
}

export class InsufficientCreditsError extends SkydropxError {
  constructor(body: unknown) {
    super('La cuenta de la marca no tiene saldo suficiente', 422, body)
    this.name = 'InsufficientCreditsError'
  }
}
