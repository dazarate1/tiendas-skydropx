import './load-env.mjs'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error('Falta Playwright. Instálalo con:')
  console.error('  npm i -D playwright')
  console.error('  npx playwright install chromium')
  process.exit(1)
}

const BASE = process.env.SHOT_BASE ?? 'http://localhost:3000'
const SLUG = process.env.SHOT_SLUG ?? 'lunaria'
const OUT = join(process.cwd(), 'shots')

const VIEWPORTS = [
  { key: 'escritorio', width: 1440, height: 900 },
  { key: 'movil', width: 390, height: 844 },
]

const fail = (label, error) => console.error(`  ✗ ${label}: ${error.message}`)

async function login(page, email, password) {
  await page.goto(`${BASE}/ingresar`, { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
}

async function shoot(page, dir, name, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(dir, `${name}.png`), fullPage: true })
    console.log(`  ✓ ${name}`)
  } catch (error) {
    fail(name, error)
  }
}

// abre la tienda, agrega un producto y despliega el carrito para capturar el checkout
async function shootCheckout(page, dir, name) {
  try {
    await page.goto(`${BASE}/s/${SLUG}`, { waitUntil: 'networkidle' })
    const add = page.locator('button.add').first()
    if (await add.count()) {
      await add.click()
      await page.click('button.cartbar')
      await page.waitForTimeout(600)
    }
    await page.screenshot({ path: join(dir, `${name}.png`), fullPage: true })
    console.log(`  ✓ ${name}`)
  } catch (error) {
    fail(name, error)
  }
}

const browser = await chromium.launch()

for (const vp of VIEWPORTS) {
  const dir = join(OUT, vp.key)
  mkdirSync(dir, { recursive: true })
  console.log(`\n${vp.key} (${vp.width}px)`)

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.width < 600,
    locale: 'es-CO',
  })
  const page = await context.newPage()

  await shoot(page, dir, '1-landing', `${BASE}/`)
  await shoot(page, dir, '2-tienda', `${BASE}/s/${SLUG}`)
  await shootCheckout(page, dir, '3-tienda-checkout')
  await shoot(page, dir, '4-ingresar', `${BASE}/ingresar`)

  const advisorEmail = process.env.ADMIN_EMAIL
  const advisorPassword = process.env.ADMIN_PASSWORD
  if (advisorEmail && advisorPassword) {
    try {
      await login(page, advisorEmail, advisorPassword)
      await shoot(page, dir, '5-panel-asesora', `${BASE}/admin`)

      const first = page.locator('.brand-list a[href^="/admin/marcas/"]').first()
      if (await first.count()) {
        const href = await first.getAttribute('href')
        await shoot(page, dir, '6-panel-asesora-marca', `${BASE}${href}`)
      }
    } catch (error) {
      fail('panel asesora', error)
    }
  } else {
    console.error('  ! ADMIN_EMAIL/ADMIN_PASSWORD ausentes: sin panel de asesora')
  }

  await context.close()

  const brandEmail = process.env.SHOT_BRAND_EMAIL
  const brandPassword = process.env.SHOT_BRAND_PASSWORD
  if (brandEmail && brandPassword) {
    const brandContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.width < 600,
      locale: 'es-CO',
    })
    const brandPage = await brandContext.newPage()
    try {
      await login(brandPage, brandEmail, brandPassword)
      await shoot(brandPage, dir, '7-panel-emprendedor', `${BASE}/panel`)
    } catch (error) {
      fail('panel emprendedor', error)
    }
    await brandContext.close()
  } else {
    console.error('  ! SHOT_BRAND_EMAIL/SHOT_BRAND_PASSWORD ausentes: sin panel de emprendedor')
  }
}

await browser.close()
console.log(`\nImágenes en ${OUT}`)
