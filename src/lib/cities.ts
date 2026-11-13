export interface City {
  name: string
  province: string
  zip: string
}

// zip = código DANE de municipio (5 dígitos), que es lo que acepta la API de Skydropx Colombia
export const CITIES: City[] = [
  { name: 'Bogotá', province: 'Cundinamarca', zip: '11001' },
  { name: 'Soacha', province: 'Cundinamarca', zip: '25754' },
  { name: 'Chía', province: 'Cundinamarca', zip: '25175' },
  { name: 'Medellín', province: 'Antioquia', zip: '05001' },
  { name: 'Envigado', province: 'Antioquia', zip: '05266' },
  { name: 'Bello', province: 'Antioquia', zip: '05088' },
  { name: 'Cali', province: 'Valle del Cauca', zip: '76001' },
  { name: 'Palmira', province: 'Valle del Cauca', zip: '76520' },
  { name: 'Barranquilla', province: 'Atlántico', zip: '08001' },
  { name: 'Cartagena', province: 'Bolívar', zip: '13001' },
  { name: 'Bucaramanga', province: 'Santander', zip: '68001' },
  { name: 'Floridablanca', province: 'Santander', zip: '68276' },
  { name: 'Pereira', province: 'Risaralda', zip: '66001' },
  { name: 'Manizales', province: 'Caldas', zip: '17001' },
  { name: 'Ibagué', province: 'Tolima', zip: '73001' },
  { name: 'Villavicencio', province: 'Meta', zip: '50001' },
  { name: 'Santa Marta', province: 'Magdalena', zip: '47001' },
  { name: 'Cúcuta', province: 'Norte de Santander', zip: '54001' },
  { name: 'Montería', province: 'Córdoba', zip: '23001' },
  { name: 'Neiva', province: 'Huila', zip: '41001' },
  { name: 'Pasto', province: 'Nariño', zip: '52001' },
  { name: 'Armenia', province: 'Quindío', zip: '63001' },
  { name: 'Popayán', province: 'Cauca', zip: '19001' },
  { name: 'Valledupar', province: 'Cesar', zip: '20001' },
  { name: 'Sincelejo', province: 'Sucre', zip: '70001' },
  { name: 'Tunja', province: 'Boyacá', zip: '15001' },
]

export function findCity(name: string): City | undefined {
  return CITIES.find((c) => c.name === name)
}
