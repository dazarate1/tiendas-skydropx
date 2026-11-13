import { getBrand } from './brands'
import { findCity } from './cities'
import { attachShipment, getOrder, paymentIsConfirmed, recordLabelError } from './orders'
import { originAddress, parcelFor, quoteFor, shipmentFor, useSimulator } from './shipping'
import { SkydropxClient } from './skydropx/client'
import { InsufficientCreditsError, SkydropxError } from './skydropx/types'
import type { Address, Rate } from './skydropx/types'

export interface LabelResult {
  ok: boolean
  error?: string
  trackingNumber?: string | null
  labelUrl?: string | null
  simulated?: boolean
}

function pickRate(rates: Rate[], carrier: string | null): Rate | undefined {
  if (carrier) {
    const same = rates.find((r) => r.carrier.toLowerCase() === carrier.toLowerCase())
    if (same) return same
  }
  return rates[0]
}

// genera la guía en la cuenta de la marca; si la cotización venció, recotiza
export async function generateLabel(orderId: string, brandId: string): Promise<LabelResult> {
  const order = await getOrder(orderId, brandId)
  if (!order) return { ok: false, error: 'Pedido no encontrado' }
  if (order.status === 'labeled') {
    return { ok: true, trackingNumber: order.tracking_number, labelUrl: order.label_url }
  }

  // regla dura: sin pago confirmado no se genera guia
  if (!(await paymentIsConfirmed(orderId, brandId))) {
    return { ok: false, error: 'El pago de este pedido todavía no está confirmado' }
  }

  const brand = await getBrand(brandId)
  if (!brand) return { ok: false, error: 'Marca no encontrada' }
  if (!brand.origin_zip || !brand.origin_street) {
    return { ok: false, error: 'La marca no tiene dirección de origen completa' }
  }

  const addressFrom: Address = originAddress(brand)
  const addressTo: Address = {
    name: order.customer_name,
    street1: order.address,
    city: order.city,
    province: findCity(order.city)?.province ?? '',
    zip: order.zip,
    phone: order.customer_phone || '3000000000',
  }
  const parcel = parcelFor(order.weight_grams)
  const simulated = await useSimulator(brandId)

  async function commit(quotationId: string, rateId: string) {
    const result = await shipmentFor(brandId, {
      quotationId,
      rateId,
      carrier: order!.carrier,
      addressFrom,
      addressTo,
      parcel,
      declaredAmount: order!.subtotal_cop,
      reference: order!.code,
    })
    await attachShipment(orderId, {
      shipmentId: result.shipment.id,
      trackingNumber: result.shipment.trackingNumber,
      labelUrl: result.shipment.labelUrl,
      carrier: result.shipment.carrier,
    })
    return {
      ok: true,
      trackingNumber: result.shipment.trackingNumber,
      labelUrl: result.shipment.labelUrl,
      simulated: result.simulated,
    }
  }

  try {
    if (order.quotation_id && order.rate_id) {
      try {
        return await commit(order.quotation_id, order.rate_id)
      } catch (error) {
        if (error instanceof InsufficientCreditsError) throw error
        if (!(error instanceof SkydropxError) || ![404, 410, 422].includes(error.status)) throw error
      }
    }

    const { quotation } = await quoteFor(brandId, addressFrom, addressTo, parcel, order.subtotal_cop)
    const rate = pickRate(quotation.rates, order.carrier)
    if (!rate) return { ok: false, error: 'Sin tarifas disponibles para este destino' }
    return await commit(quotation.id, rate.id)
  } catch (error) {
    const message =
      error instanceof InsufficientCreditsError
        ? 'La cuenta de la marca no tiene saldo. Debe recargar en Skydropx.'
        : (error as Error).message
    await recordLabelError(orderId, message)
    return { ok: false, error: message, simulated }
  }
}

export async function trackOrder(brandId: string, trackingNumber: string) {
  const client = await SkydropxClient.forBrand(brandId)
  return client.track(trackingNumber)
}
