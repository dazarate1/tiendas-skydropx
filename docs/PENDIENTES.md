# Pendientes

Ordenado por lo que bloquea más. Cada punto dice por qué está abierto, no solo qué falta.

---

## Bloqueantes para operar de verdad

### Verificación automática de la recarga mensual

Hoy la asesora marca una casilla cada mes para confirmar que la marca recargó el mínimo. Con veinte
marcas es un rato; con cien es un trabajo de tiempo completo.

El obstáculo es que `GET /finance/credits` devuelve el saldo actual, no cuánto recargó la cuenta en
un periodo. **Hay que preguntarle a Skydropx si existe forma de consultar el historial de recargas
por cuenta.** De esa respuesta depende que el modelo escale.

### Generación de guías sin verificar

`POST /shipments` está escrito pero nunca se ejecutó contra producción, porque consume saldo real.
Hay que probarlo en sandbox, o con una guía real asumiendo el costo, antes de poner la plataforma
frente a un cliente. Es el único paso del flujo completo que no está confirmado.

### Revisión legal

La base guarda nombres, teléfonos y direcciones de los compradores de **todas** las marcas. Eso es
tratamiento de datos personales bajo la Ley 1581 de 2012: hace falta política de tratamiento,
autorización del titular y definir quién es responsable y quién encargado entre la plataforma y cada
marca. No es opcional y no lo puede resolver el código.

### Límite de velocidad en memoria

`rate-limit.ts` encola en memoria dentro de un proceso. Con más de una instancia —que es lo que pasa
en cuanto se escale horizontalmente o se despliegue en serverless— deja de limitar y Skydropx empieza
a rechazar peticiones. Hay que moverlo a Redis.

---

## Decisiones de producto abiertas

### Nombre y dominio

El nombre está en una sola constante, `PRODUCT` en `src/lib/product.ts`. Cambiarlo ahí actualiza el
logo, el título, los metadatos, el pie de cada tienda y las menciones dentro de la landing. Está
puesto `Quiosco` como provisional.

Dominios `.co` verificados libres por delegación DNS en septiembre de 2026 (no es prueba notarial,
hay que confirmarlo en el carrito del registrador): `quiosco.co`, `encargo.co`, `mitienda.co`,
`vitrinas.co`, `mostrar.co`, `cajita.co`, `quiosco.com.co`, `mostrador.com.co`.

Advertencia de costo: `.co` cobra precio premium por palabras cortas y genéricas. Un dominio puede
aparecer libre y costar USD 300–2.000 al año en vez de 30. `.com.co` casi nunca es premium.

### Pasarela de pagos

La casilla existe en el panel y la opción aparece en la tienda, pero **no hay integración**. Si
alguien la activa, el comprador ve una opción que no puede completar.

Pendiente: decidir proveedor (Wompi de Bancolombia, o ePayco) y validar lo regulatorio. La regla que
no se puede romper: **el dinero no puede pasar por la cuenta del dueño de la plataforma**, porque eso
lo convierte en intermediario de pagos con todo lo que eso implica. Cada marca conecta su propia
cuenta y cobra a su nombre, igual que con las credenciales de Skydropx.

Advertencia práctica: Wompi y ePayco exigen comercio formalizado, con RUT y cuenta bancaria a nombre
del negocio. Buena parte de los emprendedores de WhatsApp no tiene eso. El comprobante manual no es
el camino barato mientras llega el bueno: va a ser el camino principal por mucho tiempo.

### Recarga mínima acumulada

Hoy el mínimo es mensual: 30.000 COP cada 30 días. Se consideró permitir acumulado trimestral
—90.000 en tres meses— para no perder al vendedor pequeño, que suele ser el que más recomienda.
Sin decidir.

### Comisión de la asesora

No está confirmado con Skydropx cómo se atribuye la comisión cuando la cuenta del cliente se abre
desde la plataforma. Es el supuesto sobre el que descansa todo el modelo económico y conviene
confirmarlo por escrito, no de palabra.

---

## Mejoras técnicas

### Subida de imágenes

Hoy los productos aceptan solo una URL de imagen. Falta subida real. El plan evaluado era
Cloudflare R2: 100 tiendas × 30 productos × 150 KB optimizados son 450 MB, dentro de los 10 GB
gratuitos y sin cargo por salida de datos.

### Comprobante de pago

`submitPaymentProof` acepta `proofUrl` pero no hay subida de archivo. El comprador solo deja el
número de referencia. Falta que pueda adjuntar la captura.

### Más ciudades

`src/lib/cities.ts` tiene 26 municipios con su código DANE. Colombia tiene más de 1.100. Hay que
cargar el listado completo del DANE, o al menos las cabeceras municipales.

### Catálogo por categorías

Ofrecido en el plan Pro de la landing, no implementado.

### Reportes

Ofrecidos en el plan Pro. Los datos ya están: cada pedido guarda lo cobrado y lo costado del envío,
así que el margen por pedido es calculable. Falta la vista.

### Exportación de pedidos

Ofrecida en el plan Pro. No implementada.

### Dominio propio por marca

Ofrecido en el plan Pro. El enrutador solo maneja subdominios del dominio raíz. Para dominios
propios hace falta resolver el dominio contra la marca en base de datos y emitir certificados por
dominio.

### Rastreo y cancelación de guías

`client.track()` y `client.cancelShipment()` están escritos y sin probar. No hay interfaz para
ninguno de los dos.

---

## Tareas manuales que quedaron pendientes en la máquina de David

Si el proyecto se clona desde cero estas ya no aplican. Si se parte de su carpeta, sí:

- Borrar `src/middleware.ts` si todavía existe (lo reemplazó `src/proxy.ts` en Next 16)
- Borrar la carpeta `src/app/_sites` si todavía existe (una carpeta con `_` al inicio es privada en
  el App Router y no genera rutas; por eso las tiendas daban 404)
- Correr `npm run db:push` después de traer los cambios de precios, que agregaron las columnas
  `plan` y `min_recharge_cop`
- Revisar que la marca de prueba siga activa: con el ciclo de recarga nuevo, una marca cuya última
  confirmación tenga más de 30 días queda pausada
