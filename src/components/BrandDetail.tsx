'use client'

import { useState, useTransition } from 'react'
import {
  actionCancelOrder,
  actionCheckCredits,
  actionConnectCredentials,
  actionDeleteProduct,
  actionGenerateLabel,
  actionSaveProduct,
  actionSetPaymentStatus,
  actionTestQuote,
  actionUpdateOrigin,
  actionUpdatePayments,
  actionUpdateProfile,
  actionUpdateShipping,
} from '@/app/panel/actions'
import {
  actionDisconnectCredentials,
  actionSetRecharge,
  actionTogglePublished,
} from '@/app/admin/actions'
import { CITIES } from '@/lib/cities'
import { PALETTES } from '@/lib/palette'
import { policyLabel, type ShippingMode } from '@/lib/shipping-policy'

export interface BrandView {
  id: string
  name: string
  slug: string
  tagline: string
  color: string
  whatsapp: string
  status: string
  plan: 'free' | 'pro'
  minRechargeCop: number
  rechargeConfirmed: boolean
  rechargeExpiresAt: string | null
  origin: { name: string; street: string; city: string; province: string; zip: string; phone: string }
  shipping: {
    mode: ShippingMode
    carriers: string[]
    flatLocalCop: number
    flatNationalCop: number
    freeOverCop: number
    markupCop: number
  }
  payments: {
    transfer: boolean
    gateway: boolean
    gatewayProvider: string
    bankName: string
    bankAccount: string
    bankHolder: string
    nequi: string
    instructions: string
  }
}

export interface ProductView {
  id: string
  name: string
  description: string
  price_cop: number
  weight_grams: number
  image_url: string | null
}

export interface OrderView {
  id: string
  code: string
  customer_name: string
  city: string
  address: string
  subtotal_cop: number
  shipping_cop: number
  shipping_quoted_cop: number
  total_cop: number
  carrier: string | null
  status: string
  payment_method: string
  payment_status: string
  payment_reference: string
  tracking_number: string | null
  label_url: string | null
  label_error: string | null
  created_at: string
}

const money = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const fecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long' }).format(new Date(iso)) : '—'

const STATUS: Record<string, string> = {
  pending: 'Listo para enviar',
  labeled: 'Guía generada',
  cancelled: 'Cancelado',
  delivered: 'Entregado',
}

const PAYMENT: Record<string, string> = {
  pending: 'Sin pagar',
  review: 'Comprobante por revisar',
  confirmed: 'Pago confirmado',
  rejected: 'Pago rechazado',
}

const MODES: ShippingMode[] = ['cheapest', 'preferred', 'flat', 'free_over', 'included']

export function BrandDetail({
  role,
  brand,
  credentials,
  products,
  orders,
  rootDomain,
}: {
  role: 'advisor' | 'brand'
  brand: BrandView
  credentials: { environment: string } | null
  products: ProductView[]
  orders: OrderView[]
  rootDomain: string
}) {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<ProductView | null>(null)
  const [mode, setMode] = useState<ShippingMode>(brand.shipping.mode)
  const [raw, setRaw] = useState('')

  const published = brand.status === 'active'
  const live = published && brand.rechargeConfirmed
  const hasOrigin = Boolean(brand.origin.zip && brand.origin.street)
  const hasPayment =
    (brand.payments.transfer && (brand.payments.bankAccount || brand.payments.nequi)) ||
    brand.payments.gateway
  const ready = Boolean(credentials) && brand.rechargeConfirmed && hasOrigin && hasPayment

  return (
    <>
      <header className="detail-head">
        <h1>{brand.name}</h1>
        <p>
          <a href={`http://${brand.slug}.${rootDomain}`} target="_blank" rel="noreferrer">
            {brand.slug}.{rootDomain}
          </a>
        </p>
        <span className={live ? 'badge ok' : 'badge'}>
          {live ? 'Publicada' : published ? 'Pausada por recarga' : 'Sin publicar'}
        </span>
      </header>

      {notice && <p className="notice">{notice}</p>}
      {raw && <pre className="raw">{raw}</pre>}

      {role === 'advisor' && (
        <section className="panel">
          <h2>Publicación</h2>
          <div className={credentials ? 'req ok' : 'req'}>
            <b>Cuenta Skydropx conectada</b><span>{credentials ? 'Listo' : 'Pendiente'}</span>
          </div>
          <div className={hasOrigin ? 'req ok' : 'req'}>
            <b>Dirección de origen</b><span>{hasOrigin ? 'Listo' : 'Pendiente'}</span>
          </div>
          <div className={hasPayment ? 'req ok' : 'req'}>
            <b>Forma de cobro</b><span>{hasPayment ? 'Listo' : 'Pendiente'}</span>
          </div>
          <div className={brand.rechargeConfirmed ? 'req ok' : 'req'}>
            <b>
              Recarga de {money(brand.minRechargeCop)}
              {brand.rechargeExpiresAt && (
                <small>
                  {brand.rechargeConfirmed ? 'Vigente hasta ' : 'Venció el '}
                  {fecha(brand.rechargeExpiresAt)}
                </small>
              )}
            </b>
            <label>
              <input
                type="checkbox"
                defaultChecked={brand.rechargeConfirmed}
                onChange={(e) => startTransition(async () => { await actionSetRecharge(brand.id, e.target.checked) })}
              />
              Confirmo
            </label>
          </div>
          <button
            type="button"
            disabled={(!ready && !published) || pending}
            onClick={() =>
              startTransition(async () => {
                const r = await actionTogglePublished(brand.id, !published)
                setNotice(r.ok ? (published ? 'Tienda despublicada' : 'Tienda publicada') : r.error ?? '')
              })
            }
          >
            {published ? 'Despublicar' : ready ? 'Publicar tienda' : 'Faltan requisitos'}
          </button>
        </section>
      )}

      {role === 'brand' && !live && (
        <section className="panel">
          <h2>{published ? 'Tu tienda está pausada' : 'Tu tienda todavía no está publicada'}</h2>
          <div className={credentials ? 'req ok' : 'req'}>
            <b>Cuenta Skydropx conectada</b><span>{credentials ? 'Listo' : 'Pendiente'}</span>
          </div>
          <div className={hasOrigin ? 'req ok' : 'req'}>
            <b>Dirección de origen</b><span>{hasOrigin ? 'Listo' : 'Pendiente'}</span>
          </div>
          <div className={hasPayment ? 'req ok' : 'req'}>
            <b>Forma de cobro</b><span>{hasPayment ? 'Listo' : 'Pendiente'}</span>
          </div>
          <div className={brand.rechargeConfirmed ? 'req ok' : 'req'}>
            <b>Recarga de {money(brand.minRechargeCop)} al mes</b>
            <span>
              {brand.rechargeConfirmed
                ? `Vigente hasta ${fecha(brand.rechargeExpiresAt)}`
                : 'Pendiente'}
            </span>
          </div>
          <p className="hint">
            Cuando completes lo que falta, tu asesora publica la tienda.
          </p>
        </section>
      )}

      <section className="panel">
        <h2>Datos de la marca</h2>
        <form action={actionUpdateProfile}>
          <input type="hidden" name="brandId" value={brand.id} />
          <div className="row">
            <label>Nombre<input name="name" defaultValue={brand.name} required maxLength={80} /></label>
            <label>WhatsApp<input name="whatsapp" defaultValue={brand.whatsapp} maxLength={20} /></label>
          </div>
          <div className="row">
            <label>Descripción corta<input name="tagline" defaultValue={brand.tagline} maxLength={120} /></label>
            <label>
              Color
              <select name="color" defaultValue={brand.color}>
                {PALETTES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
          </div>
          <button type="submit">Guardar</button>
        </form>
      </section>

      <section className="panel">
        <h2>Cómo cobras</h2>
        <p className="hint">
          Estos datos los ve el comprador cuando confirma el pedido. La guía solo se genera cuando marques el
          pago como confirmado.
        </p>
        <form action={actionUpdatePayments}>
          <input type="hidden" name="brandId" value={brand.id} />
          <label className="check">
            <input type="checkbox" name="transfer" defaultChecked={brand.payments.transfer} />
            Transferencia o Nequi, con comprobante
          </label>
          <div className="row">
            <label>Nequi<input name="nequi" defaultValue={brand.payments.nequi} maxLength={20} placeholder="3001234567" /></label>
            <label>Titular<input name="bankHolder" defaultValue={brand.payments.bankHolder} maxLength={120} /></label>
          </div>
          <div className="row">
            <label>Banco<input name="bankName" defaultValue={brand.payments.bankName} maxLength={60} placeholder="Bancolombia" /></label>
            <label>Número de cuenta<input name="bankAccount" defaultValue={brand.payments.bankAccount} maxLength={40} /></label>
          </div>
          <label>Instrucciones para el comprador<input name="instructions" defaultValue={brand.payments.instructions} maxLength={300} placeholder="Envía el comprobante por WhatsApp" /></label>

          <label className="check">
            <input type="checkbox" name="gateway" defaultChecked={brand.payments.gateway} />
            Pago en línea con pasarela
          </label>
          <button type="submit">Guardar formas de cobro</button>
        </form>
      </section>

      <section className="panel">
        <h2>Cuánto cobras por el envío</h2>
        <p className="hint">
          El comprador ve un solo precio y nunca ve la transportadora. Tú decides cómo se calcula.
        </p>
        <form action={actionUpdateShipping}>
          <input type="hidden" name="brandId" value={brand.id} />
          <label>
            Política
            <select name="mode" value={mode} onChange={(e) => setMode(e.target.value as ShippingMode)}>
              {MODES.map((m) => <option key={m} value={m}>{policyLabel(m)}</option>)}
            </select>
          </label>

          {mode === 'preferred' && (
            <label>
              Transportadoras que prefieres
              <input name="carriers" defaultValue={brand.shipping.carriers.join(', ')} placeholder="Envía, Coordinadora" />
            </label>
          )}

          {mode === 'flat' && (
            <div className="row">
              <label>Tarifa en tu ciudad<input name="flatLocal" inputMode="numeric" defaultValue={brand.shipping.flatLocalCop} /></label>
              <label>Tarifa al resto del país<input name="flatNational" inputMode="numeric" defaultValue={brand.shipping.flatNationalCop} /></label>
            </div>
          )}

          {mode === 'free_over' && (
            <label>
              Envío gratis desde
              <input name="freeOver" inputMode="numeric" defaultValue={brand.shipping.freeOverCop} placeholder="150000" />
            </label>
          )}

          {(mode === 'cheapest' || mode === 'preferred' || mode === 'free_over') && (
            <label>
              Margen que le sumas al flete
              <input name="markup" inputMode="numeric" defaultValue={brand.shipping.markupCop} placeholder="0" />
            </label>
          )}

          {mode !== 'preferred' && (
            <input type="hidden" name="carriers" value={brand.shipping.carriers.join(', ')} />
          )}
          <button type="submit">Guardar política</button>
        </form>
      </section>

      <section className="panel">
        <h2>Dirección de origen</h2>
        <p className="hint">Desde dónde salen los envíos. Es la dirección que va en la guía como remitente.</p>
        <form action={actionUpdateOrigin}>
          <input type="hidden" name="brandId" value={brand.id} />
          <div className="row">
            <label>Nombre del remitente<input name="name" defaultValue={brand.origin.name} maxLength={80} /></label>
            <label>Teléfono<input name="phone" defaultValue={brand.origin.phone} maxLength={20} /></label>
          </div>
          <label>Dirección<input name="street" defaultValue={brand.origin.street} required maxLength={160} /></label>
          <div className="row">
            <label>
              Ciudad
              <select name="city" defaultValue={brand.origin.city} required>
                <option value="">Selecciona</option>
                {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label>Departamento<input name="province" defaultValue={brand.origin.province} maxLength={60} placeholder="Se completa con la ciudad" /></label>
          </div>
          <p className="hint">El código DANE del municipio ({brand.origin.zip || '—'}) se toma automáticamente de la ciudad.</p>
          <button type="submit">Guardar origen</button>
        </form>
      </section>

      <section className="panel">
        <h2>Conexión con Skydropx</h2>
        {credentials ? (
          <div className="conn">
            <div><small>Entorno</small><b>{credentials.environment}</b></div>
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  const r = await actionCheckCredits(brand.id)
                  setNotice(r.ok ? `Saldo: ${money(Number(r.balance))} ${r.currency}` : `Saldo no disponible: ${r.error}`)
                })
              }
            >
              Consultar saldo
            </button>
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  const r = await actionTestQuote(brand.id)
                  if (r.ok) {
                    const list = (r.rates ?? []).map((x) => `${x.carrier} ${money(x.total)}`).join(' · ')
                    setNotice(`Cotización OK → ${list || 'sin tarifas (las transportadoras no respondieron a tiempo)'}`)
                    setRaw(r.raw ?? '')
                  } else {
                    setNotice(`Cotización falló: ${r.error}`)
                    setRaw(r.raw ?? '')
                  }
                })
              }
            >
              Probar cotización
            </button>
            {role === 'advisor' && (
              <button
                type="button"
                className="ghost"
                onClick={() => startTransition(async () => { await actionDisconnectCredentials(brand.id) })}
              >
                Desconectar
              </button>
            )}
          </div>
        ) : (
          <form
            action={(fd) =>
              startTransition(async () => {
                const r = await actionConnectCredentials(fd)
                setNotice(r?.ok ? 'Cuenta conectada' : r?.error ?? 'No se pudo conectar')
              })
            }
          >
            <input type="hidden" name="brandId" value={brand.id} />
            <label>Client ID<input name="clientId" autoComplete="off" required /></label>
            <label>Client Secret<input name="clientSecret" type="password" autoComplete="off" required /></label>
            <label>
              Entorno
              <select name="environment" defaultValue="sandbox">
                <option value="sandbox">Sandbox</option>
                <option value="production">Producción</option>
              </select>
            </label>
            <button type="submit" disabled={pending}>Probar y conectar</button>
          </form>
        )}
      </section>

      <section className="panel">
        <h2>Pedidos</h2>
        {!orders.length && <p className="empty">Sin pedidos todavía.</p>}
        <ul className="order-list">
          {orders.map((o) => {
            const paid = o.payment_status === 'confirmed'
            const margin = o.shipping_cop - o.shipping_quoted_cop
            return (
              <li key={o.id}>
                <div>
                  <strong>{o.code} · {o.customer_name}</strong>
                  <small>{o.address}, {o.city} · {money(o.total_cop)}</small>
                  <small>
                    Envío cobrado {money(o.shipping_cop)} · costo {money(o.shipping_quoted_cop)}
                    {margin !== 0 && ` · margen ${money(margin)}`}
                  </small>
                  {o.payment_reference && <small>Referencia {o.payment_reference}</small>}
                  {o.tracking_number && <small>Guía {o.tracking_number}</small>}
                  {o.label_error && <small className="error">{o.label_error}</small>}
                </div>
                <span className={paid ? 'badge ok' : 'badge'}>{PAYMENT[o.payment_status] ?? o.payment_status}</span>
                <span className={o.status === 'labeled' || o.status === 'delivered' ? 'badge ok' : 'badge'}>
                  {STATUS[o.status] ?? o.status}
                </span>

                {o.status === 'pending' && !paid && (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => startTransition(async () => { await actionSetPaymentStatus(brand.id, o.id, 'confirmed') })}
                    >
                      Confirmar pago
                    </button>
                    {o.payment_status === 'review' && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => startTransition(async () => { await actionSetPaymentStatus(brand.id, o.id, 'rejected') })}
                      >
                        Rechazar
                      </button>
                    )}
                  </>
                )}

                {o.status === 'pending' && paid && (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await actionGenerateLabel(brand.id, o.id)
                          setNotice(r.ok ? `Guía generada${r.trackingNumber ? ': ' + r.trackingNumber : ''}` : r.error ?? '')
                        })
                      }
                    >
                      Generar guía
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => startTransition(async () => { await actionCancelOrder(brand.id, o.id) })}
                    >
                      Cancelar
                    </button>
                  </>
                )}

                {o.label_url && <a href={o.label_url} target="_blank" rel="noreferrer">Etiqueta</a>}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Productos</h2>
        <ul className="product-list">
          {products.map((p) => (
            <li key={p.id}>
              {p.image_url ? (
                <img src={p.image_url} alt="" className="pthumb" />
              ) : (
                <span className="pthumb placeholder" />
              )}
              <div>
                <strong>{p.name}</strong>
                <small>{p.description} · {p.weight_grams} g</small>
              </div>
              <span>{money(p.price_cop)}</span>
              <button type="button" className="ghost" onClick={() => setEditing(p)}>Editar</button>
              <button
                type="button"
                className="ghost"
                onClick={() => startTransition(async () => { await actionDeleteProduct(brand.id, p.id) })}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>

        <form action={actionSaveProduct} key={editing?.id ?? 'new'} className="pform">
          <h3>{editing ? 'Editar producto' : 'Agregar producto'}</h3>
          <input type="hidden" name="brandId" value={brand.id} />
          <input type="hidden" name="id" value={editing?.id ?? ''} />
          <div className="row">
            <label>Nombre<input name="name" defaultValue={editing?.name ?? ''} required maxLength={80} /></label>
            <label>Descripción<input name="description" defaultValue={editing?.description ?? ''} maxLength={200} /></label>
          </div>
          <div className="row">
            <label>Precio (COP)<input name="price" inputMode="numeric" defaultValue={editing?.price_cop ?? ''} required /></label>
            <label>Peso (g)<input name="weight" inputMode="numeric" defaultValue={editing?.weight_grams ?? 300} /></label>
          </div>
          <label>URL de la imagen<input name="imageUrl" type="url" defaultValue={editing?.image_url ?? ''} placeholder="https://…" /></label>
          <div className="actions">
            <button type="submit">{editing ? 'Guardar cambios' : 'Agregar producto'}</button>
            {editing && <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancelar</button>}
          </div>
        </form>
      </section>
    </>
  )
}
