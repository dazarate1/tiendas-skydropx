// límite documentado: 2 peticiones por segundo y por cuenta
const MAX_PER_SECOND = 2
const WINDOW_MS = 1000

const queues = new Map<string, number[]>()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function acquire(brandId: string): Promise<void> {
  const now = Date.now()
  const stamps = (queues.get(brandId) ?? []).filter((t) => now - t < WINDOW_MS)

  if (stamps.length >= MAX_PER_SECOND) {
    const wait = WINDOW_MS - (now - stamps[0]) + 5
    queues.set(brandId, stamps)
    await sleep(wait)
    return acquire(brandId)
  }

  stamps.push(now)
  queues.set(brandId, stamps)
}
