import { demoMode } from '@/lib/shipping'

export function DemoBanner() {
  if (!demoMode()) return null
  return (
    <div className="demobar">
      Modo demostración · las marcas sin cuenta de Skydropx conectada usan tarifas y guías simuladas
    </div>
  )
}
