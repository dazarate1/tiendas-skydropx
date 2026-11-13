# tiendas-skydropx

Plataforma multi-tienda para emprendedores que venden por WhatsApp en Colombia. Cada marca recibe
una tienda propia en su subdominio, con su catálogo y el costo del envío calculado contra las
tarifas reales de su propia cuenta de Skydropx. El comprador arma el pedido, paga, y la guía se
genera desde el mismo pedido sin volver a digitar datos.

El proyecto resuelve algo que Skydropx no cubre: Skydropx entrega, pero no vende. Su «link de
pedido» captura una dirección verificada *después* de que la venta ya se acordó; no tiene catálogo,
ni precios, ni pagos, ni dominio propio. Esta plataforma es la capa de venta, más un panel de
asesoría que Skydropx no tiene en ninguna parte.

---

## 1. Las tres interfaces

El sistema tiene tres superficies con tres usuarios distintos. Entenderlas es entender el proyecto.

**La tienda** (`/s/<slug>`, o `<slug>.dominio`) — el comprador final. Ve catálogo, carrito, pide
dirección, ve **un solo precio de envío** y elige cómo paga. Nunca ve transportadoras, ni tarifas
comparadas, ni nada de la plomería.

**El panel del emprendedor** (`/panel`) — el dueño de la marca. Administra sus productos, sus
pedidos, sus credenciales de Skydropx, su política de envío y sus datos de cobro. Confirma los
pagos y genera las guías. No ve otras marcas y no puede publicar su propia tienda.

**El panel de la asesora** (`/admin`) — quien vende el servicio. Da de alta marcas, crea el acceso
del emprendedor, confirma la recarga del periodo y publica o despublica tiendas. Puede entrar al
detalle de cualquier marca de su cartera.

La landing pública (`/`) presenta el producto y manda a WhatsApp, porque **no hay registro
automático**: cada cuenta la crea la asesora. Eso es deliberado, no una carencia.

---

## 2. Requisitos

- Node.js 20.9 o superior
- PostgreSQL 15+ (Supabase sirve)
- Una cuenta de Skydropx Pro por cada marca, con sus credenciales de API

---

## 3. Puesta en marcha local

```bash
npm install
cp .env.example .env.local      # y llenar los valores
npm run keygen                  # dos veces: CREDENTIALS_KEY y SESSION_SECRET
npm run db:check                # diagnostica la conexión antes de tocar nada
npm run db:push                 # aplica el esquema
npm run dev
```

Abrir `http://localhost:3000`. Para entrar al panel, `http://localhost:3000/ingresar` con el
`ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env.local`: la primera cuenta de asesora se siembra sola en
el primer inicio de sesión y a partir de ahí vive en la base de datos.

Las tiendas funcionan de dos formas en local: `http://localhost:3000/s/<slug>` siempre, y
`http://<slug>.localhost:3000` en navegadores que resuelven subdominios de `localhost`
(Chrome y Firefox sí).

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilación y producción |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run db:check` | Diagnóstico de la conexión con mensajes por caso |
| `npm run db:push` | Aplica `db/schema.sql` (idempotente, se puede repetir) |
| `npm run db:seed` | Datos de ejemplo |
| `npm run db:brands` | Lista las marcas y su estado |
| `npm run keygen` | Genera una clave de 32 bytes en base64 |
| `npm run shots` | Capturas de las tres interfaces en `shots/` (requiere Playwright) |

---

## 4. Variables de entorno

Las cinco primeras son obligatorias; la aplicación falla al arrancar si falta alguna.

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a Postgres |
| `CREDENTIALS_KEY` | Clave AES-256-GCM que cifra las credenciales de Skydropx. **Si se pierde, las credenciales guardadas son irrecuperables.** |
| `SESSION_SECRET` | Firma las cookies de sesión y los tokens de cotización |
| `ADMIN_EMAIL` | Correo de la primera cuenta de asesora |
| `ADMIN_PASSWORD` | Su contraseña inicial |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Dominio raíz. En local `localhost:3000`, en producción `tudominio.co` sin `www` ni protocolo |
| `DEMO_MODE` | `1` hace que las marcas **sin** credenciales usen tarifas y guías simuladas. Nunca en producción |
| `SKYDROPX_WEBHOOK_SECRET` | Opcional, hasta confirmar el esquema de firma de Skydropx |

Las credenciales de Skydropx **no** son variables de entorno. Cada marca registra las suyas desde
el panel; se guardan cifradas en la base de datos y se descifran solo del lado del servidor.

---

## 5. Base de datos

### Supabase

*Project Settings → Database → Connection string*. Usar el **Session pooler** (IPv4, puerto 5432)
y reemplazar `[YOUR-PASSWORD]` por la contraseña real. Si la contraseña tiene `@`, `#`, `/` o `?`,
hay que codificarla en porcentaje o la URL no parsea.

Conviene **desactivar «Enable Data API»** en Supabase. El esquema guarda credenciales cifradas y
datos personales de los compradores de todas las marcas; las tablas autoexpuestas sin RLS se leen
con la clave anónima pública.

### Esquema

`db/schema.sql` es idempotente: `create table if not exists` y `alter table add column if not
exists`. Se puede correr las veces que haga falta. Las tablas principales:

- `brands` — la marca, su dirección de origen, su política de envío, sus datos de cobro, su plan
  y la fecha de la última recarga confirmada
- `accounts` — cuentas de acceso con rol `advisor` o `brand`; las de marca van atadas a un `brand_id`
- `brand_credentials` — client id y secret de Skydropx, cifrados
- `brand_tokens` — caché del token OAuth (vive 2 horas)
- `products`, `orders`, `order_items` — catálogo y pedidos
- `webhook_events` — eventos entrantes, persistidos antes de procesar

---

## 6. Reglas de negocio que están en el código

Estas no son convenciones: están aplicadas en la capa de datos para que no se puedan saltar desde
la interfaz.

**Publicación.** Una tienda pasa a `active` solo si tiene credenciales de Skydropx conectadas,
dirección de origen completa, forma de cobro configurada, al menos un producto activo y la recarga
del periodo confirmada. Desconectar la API o quitar la confirmación la devuelve a `draft`.

**Recarga mensual.** El plan gratis se mantiene publicado con un mínimo de recarga mensual en
Skydropx (30.000 COP por defecto, columna `min_recharge_cop`). El periodo corre 30 días desde
`recharge_confirmed_at`. Vencido, la tienda deja de mostrarse y deja de aceptar pedidos, pero no se
despublica en la base de datos: al reconfirmar, revive con todo dentro. El plan `pro` no tiene
mínimo.

**Pago antes de guía.** La guía no se genera mientras `payment_status` no sea `confirmed`. La regla
vive en `generateLabel()`, no en el botón.

**Precio del envío firmado.** El costo que ve el comprador se firma con HMAC en el servidor y se
verifica al registrar el pedido. El navegador nunca manda el monto.

**Un solo precio.** `applyPolicy()` toma la cotización real y la política de la marca y devuelve un
único número. El pedido guarda tanto `shipping_cop` (lo que pagó el comprador) como
`shipping_quoted_cop` (lo que costó de verdad), así que el margen es visible pedido por pedido.

---

## 7. Integración con Skydropx

Lo aprendido a golpes está en [`docs/SKYDROPX.md`](docs/SKYDROPX.md). Léelo antes de tocar
`src/lib/skydropx/client.ts`: hay cuatro cosas ahí que no están en la documentación oficial y que
costaron varias iteraciones de error 422.

---

## 8. Despliegue en Vercel

Ruta recomendada. Plan **Pro** obligatorio: el plan Hobby es de uso no comercial.

1. Subir el repositorio a GitHub.
2. En Vercel: *Add New Project* → importar el repositorio. Framework detectado: Next.js.
3. *Settings → Environment Variables*: cargar las obligatorias de la sección 4 para *Production*.
4. Desplegar.
5. *Settings → Domains*: agregar `tudominio.co` **y** `*.tudominio.co`.
6. En el registrador crear un `A`/`CNAME` para la raíz y un `CNAME` para `*`, según indique Vercel.
7. Esperar el certificado comodín (automático).
8. *Settings → Billing → Spend Management*: fijar un tope de gasto **antes** de recibir tráfico.
   Vercel no tiene límite duro por defecto.
9. Verificar `https://tudominio.co/api/health` → `{"status":"ok"}`.
10. Aplicar el esquema: `DATABASE_URL="..." npm run db:push` desde tu máquina.

---

## 9. Despliegue en servidor propio (Docker)

`Dockerfile` multi-etapa con salida `standalone`. Imagen final ~200 MB, corre como usuario sin
privilegios, incluye healthcheck. `docker-compose.yml` levanta Postgres 16 junto a la aplicación.

```bash
export POSTGRES_PASSWORD=... CREDENTIALS_KEY=... SESSION_SECRET=... \
       ADMIN_EMAIL=... ADMIN_PASSWORD=... NEXT_PUBLIC_ROOT_DOMAIN=tudominio.co
docker compose up -d --build
docker compose exec app node scripts/db-push.mjs
```

Hay que poner delante un proxy inverso (Caddy o Traefik) que termine TLS con certificado comodín y
reenvíe a `app:3000` **conservando el header `Host`**, que es lo que lee el enrutador de
subdominios.

Un certificado `*.dominio` **requiere validación DNS-01**, es decir credenciales de la API del
proveedor de DNS. Sin eso, cada subdominio pide su propio certificado y falla contra el límite de
Let's Encrypt. Ejemplo con Caddy y Cloudflare:

```
*.tudominio.co, tudominio.co {
  tls {
    dns cloudflare {env.CF_API_TOKEN}
  }
  reverse_proxy app:3000
}
```

---

## 10. DNS

| Registro | Nombre | Valor |
|---|---|---|
| A / CNAME | `@` | IP del servidor o destino de Vercel |
| CNAME | `*` | el mismo destino |

El comodín `*` es lo que hace que cualquier `<slug>.tudominio.co` llegue a la aplicación sin tocar
DNS por cada marca. `www`, `admin`, `api`, `app` y `panel` están reservados y no se resuelven como
tiendas.

---

## 11. Estructura

```
db/schema.sql              esquema completo, idempotente
scripts/                   utilidades de línea de comandos (.mjs, sin compilar)
src/proxy.ts               enrutador de subdominios y guarda de rutas por rol
src/app/
  page.tsx                 landing pública
  landing.css              estilos de la landing, con prefijo .lp
  globals.css              estilos de tienda y paneles
  ingresar/                acceso único, redirige según el rol
  admin/                   panel de la asesora
  panel/                   panel del emprendedor
  s/[slug]/                la tienda del comprador
  api/health               healthcheck
  api/webhooks/skydropx    recepción de eventos
src/components/
  Storefront.tsx           catálogo, carrito, checkout y pago
  BrandDetail.tsx          panel de marca, compartido por los dos roles
src/lib/
  skydropx/                cliente de la API, simulador, limitador de 2 req/s
  brands.ts                marcas, publicación y ciclo de recarga
  shipping-policy.ts       de la cotización a un solo precio
  offer.ts                 firma HMAC del costo de envío
  session.ts               sesiones firmadas y PBKDF2 para contraseñas
  crypto.ts                AES-256-GCM para las credenciales
  cities.ts                ciudades con código DANE
  product.ts               nombre comercial, precios y WhatsApp de ventas
```

---

## 12. Seguridad

- Las credenciales de Skydropx se cifran con AES-256-GCM y nunca se devuelven al navegador ni se
  escriben en logs
- Las contraseñas se guardan con PBKDF2-SHA256, 120.000 iteraciones y sal por cuenta
- Las sesiones son cookies `httpOnly` firmadas con HMAC-SHA256, con rol y marca dentro
- Toda acción de servidor pasa por `requireAdvisor`, `requireBrandAccess` o `requireOwnBrand`
- El costo del envío se firma, para que no se pueda alterar desde el cliente
- La base guarda nombres, teléfonos y direcciones de los compradores de todas las marcas: aplica la
  Ley 1581 de 2012 de protección de datos. **Esto necesita revisión legal antes de operar en serio**

---

## 13. Qué falta

En [`docs/PENDIENTES.md`](docs/PENDIENTES.md), con el contexto de cada decisión abierta.
