import { sql } from './db'

export interface OrderItemInput {
  productId: string
  name: string
  unitPriceCop: number
  weightGrams: number
  quantity: number
}

export type OrderStatus = 'pending' | 'labeled' | 'cancelled' | 'delivered'
export type PaymentMethod = 'transfer' | 'gateway'
export type PaymentStatus = 'pending' | 'review' | 'confirmed' | 'rejected'

export interface Order {
  id: string
  brand_id: string
  code: string
  customer_name: string
  customer_phone: string
  city: string
  zip: string
  address: string
  subtotal_cop: number
  shipping_cop: number
  weight_grams: number
  carrier: string | null
  rate_id: string | null
  quotation_id: string | null
  status: OrderStatus
  shipment_id: string | null
  tracking_number: string | null
  label_url: string | null
  label_error: string | null
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_reference: string
  payment_proof_url: string | null
  payment_note: string
  payment_confirmed_at: Date | null
  shipping_quoted_cop: number
  created_at: Date
}

export interface OrderItem {
  id: string
  order_id: string
  name_snapshot: string
  unit_price_cop: number
  weight_grams: number
  quantity: number
}

export async function createOrder(input: {
  brandId: string
  customerName: string
  customerPhone: string
  city: string
  zip: string
  address: string
  subtotalCop: number
  shippingCop: number
  shippingQuotedCop: number
  weightGrams: number
  carrier: string
  rateId: string
  quotationId: string
  paymentMethod: PaymentMethod
  items: OrderItemInput[]
}): Promise<Order> {
  const order = await sql.begin(async (tx) => {
    const [created] = await tx<Order[]>`
      insert into orders (brand_id, customer_name, customer_phone, city, zip, address,
                          subtotal_cop, shipping_cop, shipping_quoted_cop, weight_grams,
                          carrier, rate_id, quotation_id, payment_method)
      values (${input.brandId}, ${input.customerName}, ${input.customerPhone}, ${input.city},
              ${input.zip}, ${input.address}, ${input.subtotalCop}, ${input.shippingCop},
              ${input.shippingQuotedCop}, ${input.weightGrams}, ${input.carrier},
              ${input.rateId}, ${input.quotationId}, ${input.paymentMethod})
      returning *`

    for (const item of input.items) {
      await tx`
        insert into order_items (order_id, product_id, name_snapshot, unit_price_cop, weight_grams, quantity)
        values (${created.id}, ${item.productId}, ${item.name}, ${item.unitPriceCop},
                ${item.weightGrams}, ${item.quantity})`
    }
    return created
  })
  return order as Order
}

export async function listOrders(brandId: string, limit = 100): Promise<Order[]> {
  return sql<Order[]>`
    select * from orders where brand_id = ${brandId}
     order by created_at desc limit ${limit}`
}

export async function getOrder(id: string, brandId: string): Promise<Order | null> {
  const [row] = await sql<Order[]>`
    select * from orders where id = ${id} and brand_id = ${brandId} limit 1`
  return row ?? null
}

export async function listOrderItems(orderId: string): Promise<OrderItem[]> {
  return sql<OrderItem[]>`select * from order_items where order_id = ${orderId}`
}

export async function attachShipment(
  orderId: string,
  data: { shipmentId: string; trackingNumber: string | null; labelUrl: string | null; carrier: string | null },
) {
  await sql`
    update orders
       set shipment_id = ${data.shipmentId},
           tracking_number = ${data.trackingNumber},
           label_url = ${data.labelUrl},
           carrier = coalesce(${data.carrier}, carrier),
           status = 'labeled',
           label_error = null
     where id = ${orderId}`
}

export async function recordLabelError(orderId: string, message: string) {
  await sql`update orders set label_error = ${message.slice(0, 500)} where id = ${orderId}`
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  await sql`update orders set status = ${status} where id = ${orderId}`
}

// el comprador declara que ya pago y deja la referencia; queda en revision
export async function submitPaymentProof(
  orderId: string,
  data: { reference: string; note: string; proofUrl: string | null },
) {
  await sql`
    update orders
       set payment_status = 'review',
           payment_reference = ${data.reference.slice(0, 120)},
           payment_note = ${data.note.slice(0, 300)},
           payment_proof_url = ${data.proofUrl}
     where id = ${orderId} and payment_status in ('pending','rejected')`
}

export async function setPaymentStatus(
  orderId: string,
  brandId: string,
  status: PaymentStatus,
  accountId: string | null,
) {
  if (status === 'confirmed') {
    await sql`
      update orders
         set payment_status = 'confirmed',
             payment_confirmed_at = now(),
             payment_confirmed_by = ${accountId}
       where id = ${orderId} and brand_id = ${brandId}`
    return
  }
  await sql`
    update orders
       set payment_status = ${status},
           payment_confirmed_at = null,
           payment_confirmed_by = null
     where id = ${orderId} and brand_id = ${brandId}`
}

// regla dura: sin pago confirmado no hay guia
export async function paymentIsConfirmed(orderId: string, brandId: string): Promise<boolean> {
  const [row] = await sql<{ ok: boolean }[]>`
    select (payment_status = 'confirmed') as ok
      from orders where id = ${orderId} and brand_id = ${brandId}`
  return row?.ok ?? false
}
