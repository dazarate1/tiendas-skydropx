export type Category = 'accesorios' | 'ropa' | 'postres' | 'cosmetica' | 'general'

export interface SeedItem {
  name: string
  description: string
  priceCop: number
  weightGrams: number
}

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'accesorios', label: 'Accesorios' },
  { key: 'ropa', label: 'Ropa' },
  { key: 'postres', label: 'Postres' },
  { key: 'cosmetica', label: 'Cosmética' },
  { key: 'general', label: 'Otra' },
]

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? 'Tienda'
}

export const SEED: Record<Category, SeedItem[]> = {
  accesorios: [
    { name: 'Aretes Wayuu', description: 'Tejido a mano en hilo encerado, 4 cm', priceCop: 38000, weightGrams: 60 },
    { name: 'Collar Piedra Luna', description: 'Dije en piedra natural con baño de oro', priceCop: 52000, weightGrams: 90 },
    { name: 'Pulsera Trenzada', description: 'Hilo encerado con cierre ajustable', priceCop: 24000, weightGrams: 35 },
    { name: 'Mochila Pequeña', description: 'Tejida en fique, forro interno', priceCop: 95000, weightGrams: 420 },
    { name: 'Anillo Martillado', description: 'Plata 925 con textura artesanal', priceCop: 46000, weightGrams: 25 },
    { name: 'Aretes Gota', description: 'Baño de oro de 18k, livianos', priceCop: 34000, weightGrams: 45 },
  ],
  ropa: [
    { name: 'Camiseta Oversize', description: 'Algodón peinado, corte holgado', priceCop: 55000, weightGrams: 220 },
    { name: 'Vestido de Lino', description: 'Lino lavado, tirantes ajustables', priceCop: 128000, weightGrams: 380 },
    { name: 'Jean Wide Leg', description: 'Denim rígido, tiro alto', priceCop: 145000, weightGrams: 620 },
    { name: 'Blazer Liviano', description: 'Forro interno, corte recto', priceCop: 168000, weightGrams: 540 },
  ],
  postres: [
    { name: 'Torta de Zanahoria', description: 'Porción de 12, con queso crema', priceCop: 62000, weightGrams: 900 },
    { name: 'Caja x6 Cupcakes', description: 'Surtidos del día, empaque rígido', priceCop: 48000, weightGrams: 700 },
    { name: 'Galletas Artesanales', description: 'Bolsa x12, chips de chocolate', priceCop: 28000, weightGrams: 350 },
    { name: 'Brownies x9', description: 'Con nuez, caja para regalo', priceCop: 42000, weightGrams: 600 },
  ],
  cosmetica: [
    { name: 'Labial Mate', description: 'Larga duración, tonos cálidos', priceCop: 32000, weightGrams: 40 },
    { name: 'Serum Vitamina C', description: 'Frasco 30 ml con gotero', priceCop: 78000, weightGrams: 120 },
    { name: 'Crema Hidratante', description: 'Pote 50 g, piel sensible', priceCop: 65000, weightGrams: 200 },
    { name: 'Paleta de Sombras', description: '9 tonos, acabado mate y satinado', priceCop: 89000, weightGrams: 180 },
  ],
  general: [
    { name: 'Producto destacado', description: 'Edita este producto desde el panel', priceCop: 45000, weightGrams: 300 },
    { name: 'Producto clásico', description: 'Edita este producto desde el panel', priceCop: 32000, weightGrams: 250 },
    { name: 'Combo especial', description: 'Edita este producto desde el panel', priceCop: 79000, weightGrams: 600 },
  ],
}

export function seedFor(category: string): SeedItem[] {
  return SEED[(category as Category) in SEED ? (category as Category) : 'general']
}
