export interface Palette {
  key: string
  label: string
  base: string
  deep: string
  soft: string
}

export const PALETTES: Palette[] = [
  { key: 'ciruela', label: 'Ciruela', base: '#6B2D5C', deep: '#4A1E40', soft: '#F5EBF2' },
  { key: 'bosque', label: 'Bosque', base: '#2F6B4F', deep: '#1F4A36', soft: '#E8F2ED' },
  { key: 'cobalto', label: 'Cobalto', base: '#2A4E8F', deep: '#1B3663', soft: '#E9EFF9' },
  { key: 'terracota', label: 'Terracota', base: '#A6482F', deep: '#7A3421', soft: '#FBEDE8' },
  { key: 'indigo', label: 'Índigo', base: '#4C3F8F', deep: '#342A66', soft: '#EDEAF8' },
  { key: 'carbon', label: 'Carbón', base: '#33373D', deep: '#1F2227', soft: '#EDEEF0' },
]

export function palette(key: string): Palette {
  return PALETTES.find((p) => p.key === key) ?? PALETTES[0]
}

export function paletteVars(key: string): Record<string, string> {
  const p = palette(key)
  return { '--brand': p.base, '--brand-deep': p.deep, '--brand-soft': p.soft }
}
