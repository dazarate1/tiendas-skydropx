# Entrega del proyecto

Este documento es para quien recibe el proyecto. Léelo antes que el README: el README explica cómo
correr el código, esto explica por qué el código es como es.

---

## 1. De qué se trata

Karla vende el servicio de Skydropx en Colombia y gana comisión según el volumen de envíos de los
clientes que vincula. Sus clientes son emprendedores que venden por WhatsApp: fotos sueltas, precios
repetidos en cada chat, direcciones incompletas, pedidos anotados en un cuaderno.

Skydropx resuelve el envío, no la venta. Tiene un «link de pedido» que captura una dirección
verificada, pero eso es *después* de que la venta ya se acordó: no hay catálogo, ni precios, ni
pagos, ni dominio propio. Y no existe ninguna vista de asesor en toda la plataforma.

Este proyecto es las dos cosas que faltan: **la capa de venta para el emprendedor** y **el panel de
asesoría para Karla**.

El modelo económico tiene dos fuentes. La principal no es la suscripción: es que cada tienda
publicada obliga a una recarga efectiva en Skydropx, y eso es comisión para Karla. La secundaria es
el plan Pro a 59.900 COP al mes, con dominio propio, reportes y catálogo por categorías.

Esto explica dos decisiones que de otro modo parecen raras:

**Por qué el plan gratis exige recarga.** No se vive de la mensualidad, se vive de que la operación
de envíos funcione. El primer mes es libre; de ahí en adelante la tienda se mantiene publicada con
30.000 COP al mes de recarga. Ese dinero no es de la plataforma: es el saldo de envíos del propio
emprendedor, en su propia cuenta. Si no recarga, la tienda se pausa.

**Por qué no hay registro automático.** Cada cuenta la crea Karla. Un formulario de autoservicio la
sacaría del proceso, y con ella la comisión. Por eso la landing lleva a WhatsApp y no a un
«regístrate». La ausencia de registro es el producto, no una carencia.

---

## 2. Cada marca usa su propia cuenta de Skydropx

Es la decisión de arquitectura más importante y conviene no deshacerla.

Cada marca registra su propio `client_id` y `client_secret` de Skydropx. Las guías se generan en su
cuenta y se descuentan de su saldo. La plataforma solo lee tarifas y crea guías en nombre de cada
quien.

La alternativa —una cuenta paraguas de la plataforma— convertiría al dueño del proyecto en tesorero
de todos sus clientes, enturbiaría a quién se le atribuye la comisión, y pondría todo el riesgo
operativo en una sola cuenta. No se hizo, a propósito.

La misma lógica aplica a los pagos: cuando se integre una pasarela, cada marca conecta la suya. **El
dinero de las ventas no puede pasar por la cuenta de la plataforma.**

---

## 3. Estado real: qué funciona y qué no

### Verificado de punta a punta contra producción

Cotización real de envío contra la cuenta de una marca, con tarifas reales de Envía y Coordinadora.
Pedido registrado con su número. Mensaje de WhatsApp armado con el pedido y la dirección. Panel de
asesoría creando marcas, conectando credenciales y publicando. Tienda respondiendo en subdominio.
Diseño responsive revisado a 390 px y 768 px.

### Escrito y con typecheck limpio, pero sin probar contra producción

**Generación de guías.** `POST /shipments` nunca se ejecutó, porque consume saldo real. Es el único
paso del flujo que falta confirmar y es importante que sea lo primero que se pruebe.

**Rastreo y cancelación.** Escritos, sin interfaz y sin probar.

**Webhooks.** El endpoint recibe y guarda, pero el esquema de firma de Skydropx no está confirmado,
así que no se valida quién envía.

### No existe

**Pasarela de pagos.** La casilla está en el panel y la opción aparece en la tienda, pero no hay
integración. Si alguien la activa, el comprador ve una opción que no puede completar. Hoy el único
camino real es el comprobante manual: el comprador transfiere, deja la referencia, y el emprendedor
confirma el pago desde su panel. Hasta que no lo confirme, la guía no se puede generar.

**Subida de imágenes.** Los productos aceptan solo una URL.

**Reportes, exportación, catálogo por categorías y dominio propio.** Están ofrecidos en el plan Pro
de la landing y no están construidos. Si se sale a vender Pro antes de construirlos, eso es una
promesa incumplida.

---

## 4. Lo primero que yo haría

1. **Clonar, instalar y levantar.** El README sección 3 lo explica. Hace falta una base de datos
   propia: Supabase sirve y el plan gratis alcanza de sobra.
2. **Leer `docs/SKYDROPX.md` completo.** Ahí está lo que no está en la documentación oficial. Sin
   eso, cualquier cambio al cliente de la API termina en una tanda de errores 422.
3. **Probar la generación de una guía**, en sandbox o asumiendo el costo de una real. Es el hueco
   del flujo.
4. **Revisar `docs/PENDIENTES.md`** y decidir con David y Karla qué entra primero.

No empezaría por el diseño. La landing y los paneles están funcionales y se ven decentes; hay un
diseñador externo para eso y las capturas se generan con `npm run shots`.

---

## 5. Cómo está organizado el código

Next.js 16 con App Router, React 19, TypeScript estricto, PostgreSQL con `postgres` (postgres.js).
Sin ORM, sin librería de componentes, sin framework de CSS. Las consultas son SQL escrito a mano y
los estilos son CSS propio con variables.

Tres cosas que sorprenden si se viene de Next 15 o anterior:

- **`src/proxy.ts` reemplaza a `middleware.ts`.** En Next 16 el archivo se llama `proxy.ts` y exporta
  una función `proxy`. Ahí viven el enrutador de subdominios y la guarda de rutas por rol.
- **Una carpeta que empieza con `_` es privada** en el App Router y no genera rutas. Eso causó un
  bug real: las tiendas vivían en `_sites` y daban 404. Ahora están en `src/app/s/[slug]`.
- **`src/lib/db.ts` es un Proxy perezoso** sobre postgres.js, para que la compilación nunca abra una
  conexión.

El detalle de carpetas está en el README sección 11.

### Convención de comentarios

El código **no lleva comentarios que expliquen lo que hace una línea**. Los comentarios existentes
identifican un módulo o dejan constancia de una regla de negocio o de un hallazgo de la API. Es una
decisión explícita de David; conviene respetarla.

---

## 6. Las reglas que están en la capa de datos

Estas no se pueden saltar desde la interfaz, y está hecho así a propósito. Si algo no funciona como
se espera, revisar esto antes de buscar el bug en el componente.

- Una tienda se publica solo con credenciales, dirección de origen, forma de cobro, al menos un
  producto activo y la recarga del periodo confirmada
- La guía no se genera si el pago no está confirmado. La regla vive en `generateLabel()`
- El costo del envío se firma con HMAC en el servidor; el navegador nunca manda el monto
- El comprador ve un solo precio de envío y nunca la transportadora. La marca decide cómo se calcula
- El periodo de recarga corre 30 días; vencido, la tienda deja de mostrarse pero no se borra nada

---

## 7. Seguridad: lo que no se debe hacer

- **No poner las credenciales de Skydropx en variables de entorno.** Van por marca, cifradas en base
  de datos con AES-256-GCM
- **No perder `CREDENTIALS_KEY`.** Sin esa clave las credenciales guardadas son irrecuperables
- **No activar `DEMO_MODE=1` en producción.** Hace que las marcas sin credenciales publiquen con
  tarifas simuladas
- **No subir `.env.local` a GitHub.** Está en el `.gitignore` y debe seguir ahí
- **Dejar «Enable Data API» desactivado en Supabase.** El esquema tiene credenciales cifradas y datos
  personales de compradores; las tablas autoexpuestas sin RLS se leen con la clave anónima pública
- **No mandar credenciales por chat ni por captura de pantalla.** Cada quien las escribe en su propio
  panel

---

## 8. Qué NO viene en esta carpeta

- `node_modules` — se regenera con `npm install`
- `.next` — se regenera al compilar
- **`.env.local`** — tiene las claves reales. David las entrega aparte, por un canal seguro, o se
  generan nuevas con `npm run keygen` y una base de datos propia

---

## 9. Para subirlo a GitHub

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Estado inicial: plataforma multi-tienda con Skydropx"
git branch -M main
git remote add origin git@github.com:USUARIO/tiendas-skydropx.git
git push -u origin main
```

**Que el repositorio sea privado.** Aunque `.env.local` esté en el `.gitignore`, el código contiene
el número de WhatsApp comercial, la lógica del modelo de negocio y el esquema completo de la base de
datos.

Antes del primer `push`, verificar que no se haya colado nada:

```bash
git status --short
grep -rn "DATABASE_URL=" --include="*.local" . 2>/dev/null
```

Si `.env.local` aparece en `git status`, **no hacer commit**: revisar el `.gitignore` primero.
