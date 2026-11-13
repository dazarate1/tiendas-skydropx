import './load-env.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'

const here = dirname(fileURLToPath(import.meta.url))
const url = process.env.DATABASE_URL

if (!url) {
  console.error('DATABASE_URL no está definida.')
  console.error('Verifica que .env.local esté en la raíz del proyecto y contenga DATABASE_URL=...')
  process.exit(1)
}

const sql = postgres(url, { max: 1 })
const schema = readFileSync(join(here, '..', 'db', 'schema.sql'), 'utf8')

try {
  await sql.unsafe(schema)
  console.log('Esquema aplicado')
} catch (error) {
  console.error('Fallo al aplicar el esquema:', error.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
