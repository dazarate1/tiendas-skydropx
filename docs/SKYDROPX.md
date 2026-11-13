# Integración con Skydropx Colombia

Lo que está aquí se verificó contra una cuenta real de producción de Skydropx Colombia. Varias de
estas cosas no están en la documentación oficial y cada una costó una tanda de errores 422.

## Autenticación

OAuth 2.0 con `client_credentials`. El token vive 2 horas y se renueva con 5 minutos de margen.

```
POST /oauth/token
{ "grant_type": "client_credentials", "client_id": "...", "client_secret": "..." }
```

Base URL según entorno:

- sandbox: `https://sb-pro.skydropx.com/api/v1`
- producción: `https://pro.skydropx.com/api/v1`

El token se cachea cifrado en la tabla `brand_tokens`, una fila por marca. En el panel de Skydropx
las credenciales aparecen como **«Clave de cliente (API Key)»** y **«Clave secreta del cliente (API
Secret key)»**; son el `client_id` y el `client_secret`.

## Límite de velocidad

**2 peticiones por segundo por cuenta.** No está documentado de forma visible y es la causa más
probable de fallos intermitentes cuando varias tiendas cotizan al tiempo.

`src/lib/skydropx/rate-limit.ts` encola por marca. Es un limitador en memoria: **con más de una
instancia del servidor deja de servir** y hay que moverlo a Redis.

## Direcciones: código DANE, no código postal

Esto es lo más importante del documento.

La API de Colombia **rechaza los códigos postales de seis dígitos** con
`postal_code: ["no existe"]`. Lo que acepta es el **código DANE de municipio, de cinco dígitos**:
Bogotá `11001`, Medellín `05001`, Cali `76001`.

El esquema de dirección que funciona:

```js
{
  country_code: 'CO',
  postal_code:  '11001',        // código DANE del municipio
  area_level1:  'Cundinamarca', // departamento
  area_level2:  'Bogotá',       // ciudad
  area_level3:  '',             // barrio
  street1:      'Calle 100 # 10-20',
  name:         'Quien recibe',
  phone:        '3001234567',   // solo dígitos
  email:        'pedidos@tienda.local',
  reference:    ''
}
```

El listado de ciudades con su código DANE está en `src/lib/cities.ts`, con 26 municipios. Para
agregar una ciudad hay que agregarla ahí; no se consulta a ninguna API.

## La cotización es asíncrona

`POST /quotations` **no devuelve las tarifas**. Devuelve una cotización con `is_completed: false` y
las tarifas en `status: "pending"` con `total: null`. Hay que consultar
`GET /quotations/{id}` hasta que complete.

`client.ts` sondea 8 veces cada 1,2 segundos y corta antes si ya hay tarifas con `total`. En la
práctica las transportadoras responden en 2 a 4 segundos.

Al armar el cuerpo del POST hay dos detalles que importan:

- `parcel` va como **objeto singular**, no como arreglo. Mandarlo solo dentro de `parcels` produce
  `parcel: { weight: ["no puede estar en blanco"] }`. El cliente manda ambos por seguridad.
- `declared_amount` es **obligatorio** y entero.

Las tarifas hay que filtrarlas: llegan con `success: false`, con `total: null` o con
`status: "pending"` mezcladas entre las buenas.

## Respuesta exitosa verificada

Bogotá → Medellín, paquete de 1 kg, 20×20×20, valor declarado 50.000:

```
Envía          2 días   $8.000
Coordinadora   2 días   $8.400
```

## Saldo

`GET /finance/credits` existe en Pro y devuelve el balance. **Devuelve el saldo actual, no el
historial de recargas**, así que no sirve para verificar automáticamente si una marca cumplió la
recarga mínima del mes. Esa es la razón de que la confirmación mensual siga siendo manual.

## Guías

`POST /shipments` con `quotation_id` y `rate_id`. **Esto no está verificado contra producción**: no
se probó a propósito, porque generar una guía consume saldo real. Cotizar es gratis; generar guía
no.

Si la cotización venció, la API responde 404, 410 o 422. `generateLabel()` recotiza y reintenta una
vez.

Cuando el error 422 menciona crédito, saldo o balance, el cliente lanza `InsufficientCreditsError`
para poder mostrar un mensaje útil en vez de un error genérico.

## Contra entrega

Skydropx Colombia **sí tiene** contra entrega nativo, con Servientrega, Coordinadora, Envía, TCC,
Redetrans y otras. El dinero queda en el panel como «Cobrado» y se puede convertir a créditos de
Skydropx sin comisión, o girar al banco el jueves hábil siguiente (o al día siguiente pagando 2%).

**Se decidió no usarlo.** Trae al comprador impulsivo y el rechazo del paquete deja al emprendedor
pagando flete de ida y de vuelta. El modelo es prepago. Queda documentado por si se reconsidera.

No se verificó si el contra entrega está expuesto en la API Pro o solo en el panel web.

## Diagnóstico

`SkydropxClient` expone `lastResponse` con el cuerpo crudo de la última respuesta. El botón «Probar
cotización» del panel lo devuelve a la interfaz. Sin eso, los 422 son imposibles de depurar: la API
dice qué campo falla, pero solo si se puede ver el cuerpo.

## Lo que no está integrado

- Webhooks: el endpoint recibe y persiste en `webhook_events`, pero **el esquema de firma de
  Skydropx no está confirmado**, así que no se valida la autenticidad del remitente
- Rastreo: `client.track()` está escrito pero sin probar
- Cancelación de guías: igual
- `GET /shipments/carrier_services`: expuesto en el cliente, sin usar
