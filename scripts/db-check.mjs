import './load-env.mjs'

const raw = process.env.DATABASE_URL

if (!raw) {
  console.error('✗ DATABASE_URL no está definida.')
  console.error('  Revisa que .env.local esté junto a package.json y tenga la línea DATABASE_URL=...')
  process.exit(1)
}

if (raw.includes('usuario:clave@host')) {
  console.error('✗ DATABASE_URL todavía tiene el valor de ejemplo.')
  console.error('  Reemplázalo por la cadena real de Supabase (Connect → Direct → Session pooler → URI).')
  process.exit(1)
}

if (/\[YOUR-PASSWORD\]|%5BYOUR-PASSWORD%5D/i.test(raw)) {
  console.error('✗ La cadena todavía tiene el marcador [YOUR-PASSWORD].')
  console.error('  Reemplázalo —corchetes incluidos— por la contraseña real de la base de datos.')
  process.exit(1)
}

let parsed
try {
  parsed = new URL(raw)
} catch {
  console.error('✗ DATABASE_URL no es una URL válida.')
  console.error('  Suele pasar cuando la contraseña tiene caracteres especiales sin codificar.')
  console.error('  Codifica: @ → %40 · # → %23 · / → %2F · : → %3A · ? → %3F · & → %26')
  process.exit(1)
}

console.log('Servidor: ', parsed.hostname)
console.log('Puerto:   ', parsed.port || '5432')
console.log('Usuario:  ', decodeURIComponent(parsed.username))
console.log('Base:     ', parsed.pathname.replace(/^\//, '') || '(sin especificar)')
console.log('Clave:    ', parsed.password ? `definida (${parsed.password.length} caracteres)` : '✗ VACÍA')

if (!parsed.password) {
  console.error('\n✗ Falta la contraseña en la cadena de conexión.')
  process.exit(1)
}

let postgres
try {
  postgres = (await import('postgres')).default
} catch {
  console.error('\n✗ Falta instalar dependencias. Ejecuta: npm install')
  process.exit(1)
}

const sql = postgres(raw, { max: 1, connect_timeout: 15 })

try {
  const [row] = await sql`select current_database() as db, version() as version`
  console.log('\n✓ Conexión establecida')
  console.log('  Base:', row.db)
  console.log('  ', row.version.split(',')[0])

  const tables = await sql`
    select table_name from information_schema.tables
     where table_schema = 'public' order by table_name`
  console.log(
    tables.length
      ? `\n  Tablas existentes: ${tables.map((t) => t.table_name).join(', ')}`
      : '\n  Sin tablas todavía. Ejecuta: npm run db:push',
  )
} catch (error) {
  console.error('\n✗ No se pudo conectar:', error.message)
  if (/password authentication failed/i.test(error.message)) {
    console.error('  La contraseña no es la correcta. Usa "Reset database password" en Supabase.')
  } else if (/ENOTFOUND|EAI_AGAIN/.test(error.message)) {
    console.error('  El servidor no resuelve. Revisa que copiaste el host completo de Supabase.')
  } else if (/ETIMEDOUT|ECONNREFUSED/.test(error.message)) {
    console.error('  Sin respuesta. Si usaste "Direct connection", cambia a "Session pooler" (IPv4).')
  }
  process.exitCode = 1
} finally {
  await sql.end()
}
