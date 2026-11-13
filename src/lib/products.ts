import { sql } from './db'

export interface Product {
  id: string
  brand_id: string
  name: string
  description: string
  price_cop: number
  weight_grams: number
  image_url: string | null
  position: number
  active: boolean
}

export interface ProductInput {
  name: string
  description: string
  priceCop: number
  weightGrams: number
  imageUrl: string | null
}

export async function listProducts(brandId: string, onlyActive = false): Promise<Product[]> {
  return sql<Product[]>`
    select * from products
     where brand_id = ${brandId} ${onlyActive ? sql`and active = true` : sql``}
     order by position, created_at`
}

export async function createProduct(brandId: string, input: ProductInput): Promise<Product> {
  const [row] = await sql<Product[]>`
    insert into products (brand_id, name, description, price_cop, weight_grams, image_url, position)
    values (${brandId}, ${input.name}, ${input.description}, ${input.priceCop},
            ${input.weightGrams}, ${input.imageUrl},
            coalesce((select max(position) + 1 from products where brand_id = ${brandId}), 0))
    returning *`
  return row
}

export async function updateProduct(id: string, brandId: string, input: ProductInput) {
  await sql`
    update products
       set name = ${input.name}, description = ${input.description},
           price_cop = ${input.priceCop}, weight_grams = ${input.weightGrams},
           image_url = ${input.imageUrl}
     where id = ${id} and brand_id = ${brandId}`
}

export async function deleteProduct(id: string, brandId: string) {
  await sql`delete from products where id = ${id} and brand_id = ${brandId}`
}
