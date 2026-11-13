import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { requireOwnBrand } from '@/lib/auth'
import { getBrand } from '@/lib/brands'
import { listProducts } from '@/lib/products'
import { listOrders } from '@/lib/orders'
import { rootDomain } from '@/lib/env'
import { toBrandView, toOrderView, toProductView } from '@/lib/brand-view'
import { BrandDetail } from '@/components/BrandDetail'
import { actionLogout } from '@/app/ingresar/actions'

export const dynamic = 'force-dynamic'

export default async function PanelPage() {
  const { brandId } = await requireOwnBrand()
  const brand = await getBrand(brandId)
  if (!brand) notFound()

  const [credentials] = await sql<{ environment: string }[]>`
    select environment from brand_credentials where brand_id = ${brandId}`
  const [products, orders] = await Promise.all([listProducts(brandId), listOrders(brandId, 50)])

  const pendientes = orders.filter((o) => o.payment_status === 'review').length
  const porDespachar = orders.filter((o) => o.payment_status === 'confirmed' && o.status === 'pending').length

  return (
    <main className="admin">
      <header className="topbar">
        <div>
          <h1>Mi tienda</h1>
          <p>Tus productos, tus pedidos y tus cobros. Los envíos salen de tu cuenta de Skydropx.</p>
        </div>
        <form action={actionLogout}>
          <button type="submit" className="ghost">Salir</button>
        </form>
      </header>

      <div className="stats">
        <div><b>{pendientes}</b><span>Pagos por revisar</span></div>
        <div><b>{porDespachar}</b><span>Por despachar</span></div>
        <div><b>{products.length}</b><span>Productos</span></div>
      </div>

      <BrandDetail
        role="brand"
        brand={toBrandView(brand)}
        credentials={credentials ? { environment: credentials.environment } : null}
        products={products.map(toProductView)}
        orders={orders.map(toOrderView)}
        rootDomain={rootDomain()}
      />
    </main>
  )
}
