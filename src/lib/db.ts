import postgres from 'postgres'

type Sql = ReturnType<typeof postgres>

declare global {
  // eslint-disable-next-line no-var
  var __sql: Sql | undefined
}

function instance(): Sql {
  if (globalThis.__sql) return globalThis.__sql
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está definida')
  const created = postgres(url, { max: 5, idle_timeout: 20, prepare: false })
  globalThis.__sql = created
  return created
}

// inicialización diferida: el build no debe abrir conexión
export const sql: Sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_target, _thisArg, args: unknown[]) {
    return (instance() as unknown as (...a: unknown[]) => unknown)(...args)
  },
  get(_target, prop: string | symbol) {
    const value = (instance() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(instance()) : value
  },
})
