// nombre provisional de la plataforma: se usa en la landing, los metadatos y el pie de cada tienda
export const PRODUCT = 'Quiosco'

export const PRICE_PRO_COP = '59.900'

// recarga minima mensual en Skydropx que mantiene publicada una tienda del plan gratis
export const MIN_RECHARGE_COP = 30_000
export const MIN_RECHARGE_LABEL = '30.000'

// las cuentas las crea la asesora: la landing lleva al WhatsApp comercial, no a un registro
export const SALES_WHATSAPP = '573246147541'

export function salesLink(message: string): string {
  return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`
}
