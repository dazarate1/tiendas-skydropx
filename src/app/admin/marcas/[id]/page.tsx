import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBrand } from '@/lib/brands'
import { brandOwner } from '@/lib/accounts'
import { listProducts } from '@/lib/products'
import { listOrders } from '@/lib/orders'
import { rootDomain } from '@/lib/env'
import { sql } from '@/lib/db'
import { toBrandView, toOrderView, toProductView } from '@/lib/brand-view'
import { BrandDetail } from '@/components/BrandDetail'
import { OwnerAccess } from './OwnerAccess'

export const dynamic = 'force-dynamic'

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = await getBrand(id)
  if (!brand) notFound()

  const [credentials] = await sql<{ environment: string; connected_at: Date | null }[]>`
    select environment, connected_at from brand_credentials where brand_id = ${id}`
  const [products, orders, owner] = await Promise.all([
    listProducts(id),
    listOrders(id, 50),
    brandOwner(id),
  ])

  return (
    <main className="admin">
      <Link href="/admin" className="back">← Mis marcas</Link>
      <BrandDetail
        role="advisor"
        brand={toBrandView(brand)}
        credentials={credentials ? { environment: credentials.environment } : null}
        products={products.map(toProductView)}
        orders={orders.map(toOrderView)}
        rootDomain={rootDomain()}
      />
      <OwnerAccess
        brandId={id}
        owner={owner ? { id: owner.id, email: owner.email, name: owner.name, active: owner.active } : null}
      />
    </main>
  )
}
