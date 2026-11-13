import Link from 'next/link'
import { listBrands, rechargeIsCurrent } from '@/lib/brands'
import { rootDomain } from '@/lib/env'
import { CATEGORIES } from '@/lib/catalogs'
import { PALETTES } from '@/lib/palette'
import { actionCreateBrand } from './actions'
import { actionLogout } from '@/app/ingresar/actions'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const brands = await listBrands()
  const active = brands.filter((b) => b.status === 'active' && rechargeIsCurrent(b)).length
  const paused = brands.filter((b) => b.status === 'active' && !rechargeIsCurrent(b)).length
  const domain = rootDomain()

  return (
    <main className="admin">
      <header className="topbar">
        <div>
          <h1>Mis marcas</h1>
          <p>Da de alta cada emprendedor, conecta su cuenta y publica cuando confirmes la recarga.</p>
        </div>
        <form action={actionLogout}>
          <button type="submit" className="ghost">Salir</button>
        </form>
      </header>

      <div className="stats">
        <div><b>{brands.length}</b><span>Marcas</span></div>
        <div><b>{active}</b><span>Publicadas</span></div>
        <div><b>{paused}</b><span>Pausadas por recarga</span></div>
        <div><b>{brands.length - active - paused}</b><span>Pendientes</span></div>
      </div>

      <section className="panel">
        <h2>Agregar marca</h2>
        <form action={actionCreateBrand}>
          <div className="row">
            <label>Nombre<input name="name" required maxLength={80} /></label>
            <label>WhatsApp<input name="whatsapp" placeholder="3112345678" maxLength={20} /></label>
          </div>
          <div className="row">
            <label>Descripción corta<input name="tagline" maxLength={120} placeholder="Postres artesanales · Cali" /></label>
            <label>
              Categoría
              <select name="category" defaultValue="accesorios">
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
          </div>
          <label>
            Color de la tienda
            <select name="color" defaultValue="ciruela">
              {PALETTES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <button type="submit">Crear marca</button>
        </form>
      </section>

      <section className="panel">
        <h2>Marcas registradas</h2>
        {!brands.length && <p className="empty">Todavía no hay marcas.</p>}
        <ul className="brand-list">
          {brands.map((b) => (
            <li key={b.id}>
              <div>
                <strong>{b.name}</strong>
                <small>
                  {b.slug}.{domain} · {b.product_count} productos · {b.order_count} pedidos
                </small>
              </div>
              <div className="flags">
                <span className={b.has_credentials ? 'on' : ''}>API</span>
                <span className={rechargeIsCurrent(b) ? 'on' : ''}>Recarga</span>
                <span className={b.origin_zip ? 'on' : ''}>Origen</span>
                <span className={b.pay_bank_account || b.pay_nequi || b.pay_gateway_enabled ? 'on' : ''}>Cobro</span>
              </div>
              <span className={b.status === 'active' && rechargeIsCurrent(b) ? 'badge ok' : 'badge'}>
                {b.status !== 'active'
                  ? 'Sin publicar'
                  : rechargeIsCurrent(b)
                    ? 'Publicada'
                    : 'Pausada por recarga'}
              </span>
              <Link href={`/admin/marcas/${b.id}`}>Abrir</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
