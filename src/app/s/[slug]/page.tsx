import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBrandBySlug, rechargeIsCurrent } from '@/lib/brands'
import { rootDomain } from '@/lib/env'
import { PRODUCT } from '@/lib/product'
import { listProducts } from '@/lib/products'
import { palette, paletteVars } from '@/lib/palette'
import { categoryLabel } from '@/lib/catalogs'
import { Storefront } from '@/components/Storefront'
import { paymentOptions } from './checkout/actions'
import { BrandMark } from '@/components/BrandMark'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  return { title: brand ? brand.name : 'Tienda', description: brand?.tagline }
}

export default async function StorePage({ params }: Params) {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) notFound()

  const p = palette(brand.color)
  const style = paletteVars(brand.color) as React.CSSProperties

  if (brand.status !== 'active' || !rechargeIsCurrent(brand)) {
    return (
      <main className="locked" style={style}>
        <svg className="lock" viewBox="0 0 48 48" aria-hidden="true">
          <rect x="11" y="21" width="26" height="20" rx="5" fill={p.base} />
          <path d="M17 21v-5a7 7 0 0 1 14 0v5" fill="none" stroke={p.base} strokeWidth="3.5" />
          <circle cx="24" cy="30" r="3" fill="#fff" />
        </svg>
        <h1>{brand.name}</h1>
        <p>Esta tienda no está disponible por el momento.</p>
      </main>
    )
  }

  const products = await listProducts(brand.id, true)
  const payments = await paymentOptions(slug)

  return (
    <main className="storefront" style={style}>
      <header className="brand-head">
        <BrandMark name={brand.name} base={p.base} />
        <h1>{brand.name}</h1>
        {brand.tagline && <p className="tagline">{brand.tagline}</p>}
        <div className="trust">
          <span>Envíos a toda Colombia</span>
          <span>{payments.length ? payments.map((p) => p.label).join(' · ') : 'Pago previo al despacho'}</span>
          <span>{categoryLabel(brand.category)}</span>
        </div>
      </header>

      <Storefront
        slug={slug}
        brandName={brand.name}
        category={brand.category}
        base={p.base}
        soft={p.soft}
        payments={payments}
        products={products.map((x) => ({
          id: x.id,
          name: x.name,
          description: x.description,
          price_cop: x.price_cop,
          image_url: x.image_url,
          position: x.position,
        }))}
      />

      <footer className="store-foot">
        <span>{brand.name}</span>
        <span>Envíos gestionados con Skydropx</span>
        <a className="made-with" href={`https://${rootDomain()}`} target="_blank" rel="noopener noreferrer">
          Hecho con {PRODUCT}
        </a>
      </footer>
    </main>
  )
}
