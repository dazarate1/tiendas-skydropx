'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { requireAdvisor } from '@/lib/auth'
import { brandOwner, createAccount, findAccountByEmail, setAccountActive, setAccountPassword } from '@/lib/accounts'
import { assignAdvisor, createBrand, publishBlockers, setPublished, setRechargeConfirmed } from '@/lib/brands'
import { createProduct } from '@/lib/products'
import { seedFor } from '@/lib/catalogs'
import { demoMode } from '@/lib/shipping'

const text = (form: FormData, key: string, max = 200) =>
  String(form.get(key) ?? '').trim().slice(0, max)

export async function actionCreateBrand(form: FormData) {
  const session = await requireAdvisor()
  const name = text(form, 'name', 80)
  if (!name) return

  const category = text(form, 'category', 40) || 'general'
  const brand = await createBrand({
    name,
    tagline: text(form, 'tagline', 120),
    category,
    color: text(form, 'color', 20) || 'ciruela',
    whatsapp: text(form, 'whatsapp', 20),
  })
  await assignAdvisor(brand.id, session.accountId)

  for (const item of seedFor(category)) {
    await createProduct(brand.id, {
      name: item.name,
      description: item.description,
      priceCop: item.priceCop,
      weightGrams: item.weightGrams,
      imageUrl: null,
    })
  }

  revalidatePath('/admin')
  redirect(`/admin/marcas/${brand.id}`)
}

// acceso propio del emprendedor a su tienda
export async function actionCreateBrandOwner(form: FormData) {
  await requireAdvisor()
  const brandId = text(form, 'brandId', 40)
  const email = text(form, 'email', 160)
  const password = text(form, 'password', 200)
  const name = text(form, 'name', 120)

  if (!email || password.length < 8) {
    return { ok: false, error: 'Correo válido y contraseña de al menos 8 caracteres' }
  }

  const existing = await brandOwner(brandId)
  if (existing) {
    await setAccountPassword(existing.id, password)
    revalidatePath(`/admin/marcas/${brandId}`)
    return { ok: true, reset: true }
  }

  if (await findAccountByEmail(email)) {
    return { ok: false, error: 'Ese correo ya tiene una cuenta' }
  }

  await createAccount({ email, password, role: 'brand', brandId, name })
  revalidatePath(`/admin/marcas/${brandId}`)
  return { ok: true, reset: false }
}

export async function actionSetOwnerActive(brandId: string, accountId: string, active: boolean) {
  await requireAdvisor()
  await setAccountActive(accountId, active)
  revalidatePath(`/admin/marcas/${brandId}`)
}

export async function actionDisconnectCredentials(brandId: string) {
  await requireAdvisor()
  await sql`delete from brand_credentials where brand_id = ${brandId}`
  await sql`delete from brand_tokens where brand_id = ${brandId}`
  await setPublished(brandId, false)
  revalidatePath(`/admin/marcas/${brandId}`)
}

export async function actionSetRecharge(brandId: string, confirmed: boolean) {
  await requireAdvisor()
  await setRechargeConfirmed(brandId, confirmed)
  revalidatePath(`/admin/marcas/${brandId}`)
}

export async function actionTogglePublished(brandId: string, publish: boolean) {
  await requireAdvisor()
  if (publish) {
    let blockers = await publishBlockers(brandId)
    if (demoMode()) blockers = blockers.filter((b) => !b.startsWith('Cuenta Skydropx'))
    if (blockers.length) return { ok: false, error: blockers.join(' · ') }
  }
  await setPublished(brandId, publish)
  revalidatePath(`/admin/marcas/${brandId}`)
  return { ok: true }
}
