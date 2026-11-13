import './load-env.mjs'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('✗ DATABASE_URL no está definida.')
  process.exit(1)
}

let postgres
try {
  postgres = (await import('postgres')).default
} catch {
  console.error('✗ Falta instalar dependencias. Ejecuta: npm install')
  process.exit(1)
}

const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'
const sql = postgres(url, { max: 1, connect_timeout: 15 })

try {
  const brands = await sql`
    select b.slug, b.name, b.status, b.origin_zip,
           (b.recharge_confirmed_at is not null) as recarga,
           (select count(*)::int from products p where p.brand_id = b.id) as productos,
           exists (select 1 from brand_credentials c where c.brand_id = b.id) as api
      from brands b order by b.created_at`

  if (!brands.length) {
    console.log('No hay marcas registradas.')
    console.log('Carga la marca de ejemplo con: npm run db:seed')
    console.log('O crea una desde el panel en /admin')
  } else {
    console.log(`Dominio raíz configurado: ${domain}\n`)
    for (const b of brands) {
      const publicada = b.status === 'active'
      console.log(`${publicada ? '●' : '○'} ${b.name}`)
      console.log(`   URL:       http://${b.slug}.${domain}`)
      console.log(`   Estado:    ${b.status}${publicada ? '' : '  (la tienda no se muestra hasta publicarla)'}`)
      console.log(`   Productos: ${b.productos}`)
      console.log(`   Requisitos: API ${b.api ? '✓' : '✗'} · Recarga ${b.recarga ? '✓' : '✗'} · Origen ${b.origin_zip ? '✓' : '✗'}`)
      console.log()
    }
    console.log('Abre exactamente la URL que aparece arriba, con el subdominio.')
  }
} catch (error) {
  console.error('✗ Error al consultar:', error.message)
  if (/relation .* does not exist/i.test(error.message)) {
    console.error('  Las tablas no existen. Ejecuta: npm run db:push')
  }
  process.exitCode = 1
} finally {
  await sql.end()
}
