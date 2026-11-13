'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { declarePayment, placeOrder, quoteShipping } from '@/app/s/[slug]/checkout/actions'
import type { PaymentOption, ShippingQuote } from '@/app/s/[slug]/checkout/actions'
import { CITIES } from '@/lib/cities'
import { ProductArt } from './ProductArt'

export interface StoreProduct {
  id: string
  name: string
  description: string
  price_cop: number
  image_url: string | null
  position: number
}

interface Props {
  slug: string
  brandName: string
  category: string
  base: string
  soft: string
  products: StoreProduct[]
  payments: PaymentOption[]
}

const money = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

type Stage = 'shopping' | 'placed'

interface Placed {
  code: string
  orderId: string
  whatsapp: string
  message: string
  option: PaymentOption
  total: number
}

export function Storefront({ slug, brandName, category, base, soft, products, payments }: Props) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [open, setOpen] = useState(false)
  const [city, setCity] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [quote, setQuote] = useState<ShippingQuote | null>(null)
  const [method, setMethod] = useState(payments[0]?.method ?? 'transfer')
  const [reference, setReference] = useState('')
  const [declared, setDeclared] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<Stage>('shopping')
  const [placed, setPlaced] = useState<Placed | null>(null)
  const [pending, startTransition] = useTransition()

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => ({ product: products.find((p) => p.id === id), quantity }))
        .filter((l): l is { product: StoreProduct; quantity: number } => Boolean(l.product)),
    [cart, products],
  )
  const count = lines.reduce((s, l) => s + l.quantity, 0)
  const subtotal = lines.reduce((s, l) => s + l.product.price_cop * l.quantity, 0)
  const shipping = quote?.ok ? quote.shippingCop ?? 0 : 0
  const total = subtotal + shipping

  useEffect(() => {
    document.body.classList.toggle('sheet-open', open)
    return () => document.body.classList.remove('sheet-open')
  }, [open])

  function resetQuote() {
    setQuote(null)
  }

  function change(id: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev }
      const value = (next[id] ?? 0) + delta
      if (value <= 0) delete next[id]
      else next[id] = value
      return next
    })
    resetQuote()
  }

  function onQuote() {
    setError('')
    startTransition(async () => {
      const r = await quoteShipping(
        slug,
        city,
        lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      )
      if (!r.ok) {
        setError(r.error ?? 'No se pudo calcular el envío')
        return
      }
      setQuote(r)
    })
  }

  function onPlace() {
    if (!quote?.token) return
    setError('')
    startTransition(async () => {
      const r = await placeOrder(slug, {
        customerName: name,
        customerPhone: phone,
        city,
        address,
        token: quote.token!,
        paymentMethod: method,
        lines: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      })
      if (!r.ok) {
        setError(r.error ?? 'No se pudo registrar el pedido')
        return
      }
      const option = payments.find((p) => p.method === method) ?? payments[0]
      setPlaced({
        code: r.code!,
        orderId: r.orderId!,
        whatsapp: r.whatsapp!,
        message: r.message!,
        option,
        total,
      })
      setStage('placed')
    })
  }

  function onDeclare() {
    if (!placed) return
    startTransition(async () => {
      await declarePayment(placed.orderId, { reference, note: '' })
      setDeclared(true)
    })
  }

  function startOver() {
    setCart({})
    resetQuote()
    setPlaced(null)
    setReference('')
    setDeclared(false)
    setStage('shopping')
    setOpen(false)
  }

  const canQuote = Boolean(lines.length && city && name.trim() && address.trim())

  return (
    <div className="store">
      <section className="catalog">
        <h2 className="section-label">Catálogo</h2>
        {!products.length && <p className="empty">Esta tienda todavía no tiene productos.</p>}
        <div className="grid">
          {products.map((p) => {
            const qty = cart[p.id] ?? 0
            return (
              <article key={p.id} className="card">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="thumb" loading="lazy" />
                ) : (
                  <ProductArt category={category} index={p.position} base={base} soft={soft} className="thumb" />
                )}
                <div className="card-body">
                  <h3>{p.name}</h3>
                  {p.description && <p>{p.description}</p>}
                  <div className="card-row">
                    <span className="price">{money(p.price_cop)}</span>
                    {qty === 0 ? (
                      <button type="button" className="add" onClick={() => change(p.id, 1)}>
                        Agregar
                      </button>
                    ) : (
                      <span className="qty">
                        <button type="button" onClick={() => change(p.id, -1)} aria-label="Quitar uno">−</button>
                        <b>{qty}</b>
                        <button type="button" onClick={() => change(p.id, 1)} aria-label="Agregar uno">+</button>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <button
        type="button"
        className="cartbar"
        onClick={() => setOpen(true)}
        hidden={count === 0 || open}
        aria-label="Ver pedido"
      >
        <span className="cartbar-count">{count}</span>
        <span className="cartbar-text">{count === 1 ? '1 producto' : `${count} productos`}</span>
        <span className="cartbar-total">{money(subtotal)}</span>
        <span className="cartbar-cta">Ver pedido</span>
      </button>

      <div className="sheet-backdrop" hidden={!open} onClick={() => setOpen(false)} />

      <aside className={open ? 'checkout open' : 'checkout'} aria-label="Tu pedido">
        <div className="sheet-handle" aria-hidden="true" />
        <button type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>

        {stage === 'placed' && placed ? (
          <div className="placed">
            <div className="placed-icon" aria-hidden="true">✓</div>
            <h3>Pedido <span className="nowrap">{placed.code}</span> registrado</h3>

            <div className="paybox">
              <p className="paybox-head">
                {placed.option?.method === 'gateway' ? 'Paga en línea' : 'Paga y confirma'}
              </p>
              <p className="paybox-amount">{money(placed.total)}</p>
              {placed.option?.detail && <p className="paybox-detail">{placed.option.detail}</p>}
              <p className="paybox-rule">
                {brandName} despacha tu pedido cuando el pago quede confirmado.
              </p>
            </div>

            {placed.option?.method === 'transfer' && !declared && (
              <div className="declare">
                <label htmlFor="f-ref">Número de comprobante o referencia</label>
                <input
                  id="f-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej. 4821903"
                />
                <button type="button" className="btn ghost" onClick={onDeclare} disabled={pending || !reference.trim()}>
                  {pending ? 'Enviando…' : 'Ya pagué'}
                </button>
              </div>
            )}

            {declared && (
              <p className="declared">
                Recibimos tu referencia. {brandName} la verifica y te confirma por WhatsApp.
              </p>
            )}

            <pre className="wamsg">{placed.message}</pre>
            <a className="btn wa" href={placed.whatsapp} target="_blank" rel="noreferrer">
              <WhatsAppIcon /> Enviar por WhatsApp
            </a>
            <button type="button" className="btn ghost" onClick={startOver}>Hacer otro pedido</button>
          </div>
        ) : (
          <>
            <div className="panel">
              <h3>Tu pedido</h3>
              {!lines.length && <p className="empty">Aún no has agregado productos.</p>}
              {lines.map((l) => (
                <div key={l.product.id} className="line">
                  <span className="line-name">
                    {l.product.name}
                    <small>{money(l.product.price_cop)} c/u</small>
                  </span>
                  <span className="qty">
                    <button type="button" onClick={() => change(l.product.id, -1)} aria-label="Quitar uno">−</button>
                    <b>{l.quantity}</b>
                    <button type="button" onClick={() => change(l.product.id, 1)} aria-label="Agregar uno">+</button>
                  </span>
                  <span className="line-total">{money(l.product.price_cop * l.quantity)}</span>
                </div>
              ))}
              {!!lines.length && (
                <div className="totals">
                  <div>
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <div>
                    <span>Envío</span>
                    <span>{quote?.ok ? (quote.free ? 'Gratis' : money(shipping)) : 'Por calcular'}</span>
                  </div>
                  <div className="grand">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="panel">
              <h3>Datos de entrega</h3>
              <label htmlFor="f-name">Nombre completo</label>
              <input id="f-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />

              <label htmlFor="f-phone">WhatsApp</label>
              <input id="f-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />

              <label htmlFor="f-city">Ciudad</label>
              <select id="f-city" value={city} onChange={(e) => { setCity(e.target.value); resetQuote() }}>
                <option value="">Selecciona tu ciudad</option>
                {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>

              <label htmlFor="f-addr">Dirección</label>
              <input id="f-addr" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />

              {!quote?.ok && (
                <button type="button" className="btn primary" onClick={onQuote} disabled={pending || !canQuote}>
                  {pending ? 'Calculando…' : 'Calcular envío'}
                </button>
              )}
            </div>

            {quote?.ok && (
              <div className="panel">
                <h3>Envío y pago</h3>
                <div className="ship-line">
                  <span>
                    Envío a {city}
                    <small>{quote.days ? `Llega en ${quote.days} días hábiles` : quote.note || 'Despacho al confirmar el pago'}</small>
                  </span>
                  <b>{quote.free ? 'Gratis' : money(shipping)}</b>
                </div>

                {payments.length > 1 ? (
                  <div className="paylist">
                    {payments.map((p) => (
                      <label key={p.method} className={method === p.method ? 'payopt on' : 'payopt'}>
                        <input
                          type="radio"
                          name="pay"
                          checked={method === p.method}
                          onChange={() => setMethod(p.method)}
                        />
                        <span>
                          {p.label}
                          <small>{p.detail}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  payments[0] && (
                    <p className="paysingle">
                      Pago por {payments[0].label.toLowerCase()}. Te mostramos los datos al confirmar.
                    </p>
                  )
                )}

                <button
                  type="button"
                  className="btn primary"
                  onClick={onPlace}
                  disabled={pending || !payments.length}
                >
                  {pending ? 'Registrando…' : `Confirmar pedido · ${money(total)}`}
                </button>
              </div>
            )}

            {error && <p className="error">{error}</p>}
          </>
        )}
      </aside>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.5 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.7-1.2-4.4-3.9-4.6-4.1-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.9-1c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
    </svg>
  )
}
