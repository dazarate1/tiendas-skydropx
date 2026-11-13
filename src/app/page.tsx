import type { Metadata } from 'next'
import Link from 'next/link'
import { MIN_RECHARGE_LABEL, PRICE_PRO_COP, PRODUCT, salesLink } from '@/lib/product'
import './landing.css'

const PRICE_PRO = PRICE_PRO_COP
const MIN_RECHARGE = MIN_RECHARGE_LABEL

const CTA_FREE = salesLink(`Hola, vi la página de ${PRODUCT} y quiero abrir mi tienda.`)
const CTA_PRO = salesLink(`Hola, quiero la tienda de ${PRODUCT} con el plan Pro.`)

export const metadata: Metadata = {
  title: `${PRODUCT} · Tu tienda para vender por WhatsApp con envíos de Skydropx`,
  description:
    'Una tienda con tu marca, tu catálogo y el costo del envío calculado con tarifas reales de Skydropx. El cliente llega al chat con el pedido armado y la dirección completa.',
}

const TODAY = [
  'Mandas fotos sueltas y repites el precio en cada conversación.',
  '«¿Cuánto vale el envío a Pasto?» y te toca salir a cotizar mientras el cliente espera.',
  '«Pásame la dirección» y llega sin barrio, sin ciudad o sin teléfono.',
  'Anotas el pedido en un cuaderno o en una hoja de Excel.',
  'Vuelves a escribir los mismos datos en Skydropx para generar la guía.',
]

const AFTER = [
  'Un solo enlace con tu catálogo, tus fotos y tus precios.',
  'El cliente ve el costo del envío a su ciudad antes de escribirte, con tarifas reales.',
  'La dirección llega completa y con la ciudad validada contra el listado oficial.',
  'Cada pedido queda registrado con su número y su estado.',
  'La guía sale desde el mismo pedido, en tu cuenta de Skydropx.',
]

const STEPS = [
  {
    title: 'Nos escribes',
    body: 'Te abrimos la tienda con tu nombre, tus colores y el WhatsApp al que quieres que te escriban.',
  },
  {
    title: 'Cargas tus productos',
    body: 'Foto, precio y peso. El peso es lo que permite cotizar el envío sin preguntarte nada.',
  },
  {
    title: 'Conectas tu Skydropx',
    body: 'Tu cuenta, tus credenciales. Las guías salen a tu nombre y se descuentan de tu saldo.',
  },
  {
    title: 'Compartes el enlace',
    body: 'En el estado, en la bio de Instagram o en el mismo chat cuando te pregunten qué tienes.',
  },
]

const LIMITS = [
  {
    title: 'No cobramos los pagos',
    body: 'El cliente te paga como ya te paga hoy: transferencia, Nequi o contra entrega. Nosotros no tocamos tu plata ni nos quedamos con un porcentaje de tus ventas.',
  },
  {
    title: 'No es un marketplace',
    body: 'Nadie más vende dentro de tu tienda. No hay vitrina compartida, no hay competidores al lado de tus productos y no le vendemos tu lista de clientes a nadie.',
  },
  {
    title: 'No manejamos tu saldo',
    body: 'La cuenta de Skydropx es tuya. Tú recargas, tú ves el saldo y tú decides con qué transportadora despachas. Nosotros solo leemos las tarifas y creamos la guía.',
  },
  {
    title: 'No reemplaza WhatsApp',
    body: 'El cierre de la venta sigue siendo tuyo y en tu chat. La tienda llega hasta el pedido armado; de ahí en adelante hablas tú, que es lo que sabes hacer.',
  },
]

const FAQ = [
  {
    q: '¿Me registro solo o tengo que escribirles?',
    a: `No hay registro automático, y es a propósito. Cada tienda queda conectada a una cuenta de Skydropx con credenciales propias, y eso se hace acompañado: te escribimos por WhatsApp, te ayudamos a abrir o revisar tu cuenta, cargamos tus primeros productos contigo y te entregamos el acceso a tu panel. De ahí en adelante entras por tu cuenta cuando quieras.`,
  },
  {
    q: '¿Por qué el plan gratis pide una recarga en Skydropx?',
    a: `Porque la tienda no funciona sin envíos: cotiza y genera guías contra tu cuenta de Skydropx, y sin saldo no hay guía. El primer mes es libre. De ahí en adelante la tienda se mantiene publicada mientras recargues al menos $${MIN_RECHARGE} al mes. Esa es también la razón por la que el plan puede ser gratis: no vivimos de una mensualidad tuya, vivimos de que la operación de envíos funcione.`,
  },
  {
    q: `¿Esos $${MIN_RECHARGE} son un pago para ustedes?`,
    a: 'No. Es tu propio saldo de envíos en tu cuenta de Skydropx, a tu nombre, y lo gastas en tus propias guías. Nosotros no lo recibimos, no lo administramos y no te pedimos tarjeta. Si dejas de usar la plataforma, ese saldo sigue siendo tuyo.',
  },
  {
    q: `¿Qué pasa si un mes no llego a los $${MIN_RECHARGE}?`,
    a: 'La tienda deja de estar publicada hasta tu siguiente recarga. No se borra nada: tus productos, tus pedidos y tu historial quedan intactos y el enlace vuelve a funcionar apenas recargues. Si con tu volumen esa cifra te queda grande, probablemente todavía no necesitas una tienda.',
  },
  {
    q: '¿De quién es la cuenta de Skydropx?',
    a: 'Tuya. Se abre a tu nombre y con tu NIT o cédula, y tú controlas las recargas. Nosotros guardamos tus credenciales cifradas para poder cotizar y crear guías desde la tienda, y las puedes desconectar cuando quieras desde tu panel.',
  },
  {
    q: '¿Necesito comprar un dominio?',
    a: `No. Tu tienda arranca en un subdominio propio del tipo tumarca.tienda.co, que ya es un enlace limpio para compartir. Si más adelante quieres tumarca.com, eso es lo que agrega el plan ${PRODUCT} Pro.`,
  },
  {
    q: '¿Qué pasa si me quedo sin saldo?',
    a: 'La tienda sigue publicada y el cliente sigue viendo el precio del envío. Lo que no se puede es generar la guía hasta que recargues. No se pierde ningún pedido.',
  },
  {
    q: '¿Puedo cancelar el plan Pro?',
    a: 'Sí, mes a mes y sin cláusula de permanencia. La tienda vuelve al plan gratis con todo lo que tenías: productos, pedidos e historial. No se borra nada.',
  },
  {
    q: '¿Cuántos productos puedo subir?',
    a: 'Treinta en el plan gratis, que alcanza para el catálogo real de la mayoría de emprendimientos. Sin límite en Pro.',
  },
]

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <span className="lp-logo">
            <span className="lp-logo-mark" aria-hidden="true">
              {PRODUCT.charAt(0)}
            </span>
            {PRODUCT}
          </span>
          <nav className="lp-nav-links">
            <a href="#como">Cómo funciona</a>
            <a href="#precios">Precios</a>
            <a href="#limites">Qué no hace</a>
            <a href="#preguntas">Preguntas</a>
          </nav>
          <Link href="/ingresar" className="lp-btn lp-btn-ghost lp-btn-sm lp-nav-cta">
            Ya tengo tienda
          </Link>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <h1 className="lp-h1">
                Vendes por WhatsApp. El pedido lo sigues <em>armando a mano</em>.
              </h1>
              <p>
                {PRODUCT} te da una tienda con tu marca, tu catálogo y el costo del envío calculado
                con tarifas reales de Skydropx. El cliente te escribe cuando ya eligió qué quiere,
                cuánto paga de envío y a qué dirección llega.
              </p>
              <div className="lp-hero-cta">
                <a href={CTA_FREE} className="lp-btn lp-btn-wa" target="_blank" rel="noreferrer">
                  <WhatsAppIcon /> Abrir mi tienda
                </a>
                <a href="#como" className="lp-btn lp-btn-ghost">
                  Ver cómo funciona
                </a>
              </div>
              <p className="lp-setup">
                No la montas solo. Nos escribes, te ayudamos a abrir tu cuenta de Skydropx y te
                entregamos la tienda lista con tus productos cargados.
              </p>
              <p className="lp-gate">
                <span aria-hidden="true">◆</span>
                <span>
                  <b>Primer mes gratis, sin tarjeta.</b> Después se mantiene con ${MIN_RECHARGE} al
                  mes de recarga en Skydropx, que es tu propio saldo de envíos.
                </span>
              </p>
            </div>

            <div className="lp-mock" aria-hidden="true">
              <div className="lp-mock-bar">
                <span className="lp-mock-url">lunaria.tienda.co</span>
              </div>
              <div className="lp-mock-body">
                <div className="lp-mock-brand">
                  <span className="lp-mock-avatar" />
                  <span>
                    <strong>Lunaria</strong>
                    <span>Joyería artesanal · Bogotá</span>
                  </span>
                </div>
                <div className="lp-mock-items">
                  <div className="lp-mock-item">
                    <div className="lp-mock-ph" />
                    <b>Aretes Luna</b>
                    <span>$48.000</span>
                  </div>
                  <div className="lp-mock-item">
                    <div className="lp-mock-ph" />
                    <b>Collar Aura</b>
                    <span>$72.000</span>
                  </div>
                </div>
                <div className="lp-mock-ship">
                  <div className="lp-mock-ship-h">Envío a Medellín</div>
                  <div className="lp-rate lp-rate-best">
                    <b>Envía</b>
                    <span>2 días</span>
                    <i>$8.000</i>
                  </div>
                  <div className="lp-rate">
                    <b>Coordinadora</b>
                    <span>2 días</span>
                    <i>$8.400</i>
                  </div>
                </div>
                <div className="lp-mock-wa">Confirmar pedido por WhatsApp</div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec lp-alt" id="como">
          <div className="lp-wrap">
            <p className="lp-eyebrow">El cambio real</p>
            <h2 className="lp-h2">Lo mismo que vendes hoy, pero sin el trabajo de por medio</h2>
            <p className="lp-lede">
              No te pedimos cambiar de canal ni aprender una plataforma nueva. La venta se sigue
              cerrando en tu WhatsApp. Lo que cambia es todo lo que hoy haces antes de llegar ahí.
            </p>

            <div className="lp-vs">
              <div className="lp-col lp-col-now">
                <p className="lp-col-head">Como lo haces hoy</p>
                <ul>
                  {TODAY.map((line) => (
                    <li key={line}>
                      <span className="lp-mk lp-mk-now" aria-hidden="true">
                        ×
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lp-col lp-col-next">
                <p className="lp-col-head">Con tu tienda publicada</p>
                <ul>
                  {AFTER.map((line) => (
                    <li key={line}>
                      <span className="lp-mk lp-mk-next" aria-hidden="true">
                        ✓
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lp-steps">
              {STEPS.map((step, i) => (
                <div className="lp-step" key={step.title}>
                  <p className="lp-num">{String(i + 1).padStart(2, '0')}</p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" id="precios">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Precios</p>
            <h2 className="lp-h2">Qué te cuesta arrancar</h2>
            <p className="lp-lede">
              Dos planes y ninguna comisión por venta. El envío lo pagas en Skydropx como ya lo
              pagas hoy, con las mismas tarifas de tu cuenta y sin intermediarios.
            </p>

            <div className="lp-plans">
              <div className="lp-plan">
                <div>
                  <p className="lp-plan-name">Tienda</p>
                  <p className="lp-price">
                    Gratis <small>el primer mes</small>
                  </p>
                  <p className="lp-cond">
                    <b>Se activa con tu primera recarga en Skydropx.</b> Del segundo mes en adelante
                    se mantiene publicada con ${MIN_RECHARGE} al mes de recarga. Ese dinero no es
                    nuestro: es tu saldo de envíos y lo gastas en tus propias guías.
                  </p>
                </div>
                <ul>
                  <li>
                    <Tick />
                    <span>
                      <b>Tu tienda en tumarca.tienda.co</b>, con tu nombre, tus colores y tu logo.
                    </span>
                  </li>
                  <li>
                    <Tick />
                    <span>Hasta 30 productos con foto, precio y peso.</span>
                  </li>
                  <li>
                    <Tick />
                    <span>
                      <b>Cotización de envío en vivo</b> con las transportadoras de tu cuenta.
                    </span>
                  </li>
                  <li>
                    <Tick />
                    <span>Pedidos numerados con dirección completa y validada.</span>
                  </li>
                  <li>
                    <Tick />
                    <span>Generación de guías desde el pedido, sin volver a digitar datos.</span>
                  </li>
                  <li>
                    <Tick />
                    <span>Mensaje de WhatsApp armado con el pedido, listo para que te escriban.</span>
                  </li>
                </ul>
                <div className="lp-plan-foot">
                  <a href={CTA_FREE} className="lp-btn lp-btn-ghost lp-btn-wide" target="_blank" rel="noreferrer">
                    <WhatsAppIcon /> Pedir mi tienda
                  </a>
                  <p className="lp-plan-note">
                    No pedimos tarjeta ni datos bancarios. Lleva el pie de página «Hecho con {PRODUCT}».
                  </p>
                </div>
              </div>

              <div className="lp-plan lp-plan-pro">
                <span className="lp-ribbon">Cuando ya estás vendiendo</span>
                <div>
                  <p className="lp-plan-name">{PRODUCT} Pro</p>
                  <p className="lp-price">
                    ${PRICE_PRO} <small>COP al mes</small>
                  </p>
                  <p className="lp-cond">
                    <b>Todo lo del plan gratis, más lo que se necesita cuando el volumen sube.</b>{' '}
                    Mes a mes, sin permanencia y sin recarga mínima.
                  </p>
                </div>
                <ul>
                  <li>
                    <Tick />
                    <span>
                      <b>Tu propio dominio</b>: tumarca.com en lugar del subdominio.
                    </span>
                  </li>
                  <li>
                    <Tick />
                    <span>Productos ilimitados y catálogo por categorías.</span>
                  </li>
                  <li>
                    <Tick />
                    <span>
                      <b>Reportes de ventas y envíos</b>: qué se vende, a qué ciudades y cuánto te
                      está costando despachar.
                    </span>
                  </li>
                  <li>
                    <Tick />
                    <span>Exportación de pedidos para tu contabilidad.</span>
                  </li>
                  <li>
                    <Tick />
                    <span>Soporte prioritario por WhatsApp con tu asesora de Skydropx.</span>
                  </li>
                </ul>
                <div className="lp-plan-foot">
                  <a href={CTA_PRO} className="lp-btn lp-btn-wa lp-btn-wide" target="_blank" rel="noreferrer">
                    <WhatsAppIcon /> Empezar con Pro
                  </a>
                  <p className="lp-plan-note">
                    Se paga cuando ya tienes la tienda publicada y vendiendo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec lp-alt" id="limites">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Sin letra chica</p>
            <h2 className="lp-h2">Lo que {PRODUCT} no hace</h2>
            <p className="lp-lede">
              Preferimos decirlo antes de que lo descubras. Si necesitas algo de esta lista, esta no
              es la herramienta.
            </p>
            <div className="lp-honest">
              {LIMITS.map((item) => (
                <div key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" id="preguntas">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Preguntas</p>
            <h2 className="lp-h2">Lo que todo el mundo pregunta primero</h2>
            <div className="lp-faq">
              {FAQ.map((item, i) => (
                <details key={item.q} open={i === 0}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-wrap">
          <div className="lp-end">
            <h2>Tu catálogo deja de ser una carpeta de fotos</h2>
            <p>
              Escríbenos, armamos tu tienda contigo y la publicamos con tu primera recarga. Una
              conversación, no un formulario.
            </p>
            <a href={CTA_FREE} className="lp-btn" target="_blank" rel="noreferrer">
              <WhatsAppIcon /> Escribir por WhatsApp
            </a>
            <small>Primer mes gratis · Sin tarjeta · Sin comisión por venta</small>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <span>
            {PRODUCT} · Tiendas para vender por WhatsApp con envíos de Skydropx en Colombia
          </span>
          <span className="lp-foot-links">
            <a href="#precios">Precios</a>
            <a href="#preguntas">Preguntas</a>
            <a href={CTA_FREE} target="_blank" rel="noreferrer">WhatsApp</a>
            <Link href="/ingresar">Entrar</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.5 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.7-1.2-4.4-3.9-4.6-4.1-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.9-1c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
    </svg>
  )
}

function Tick() {
  return (
    <svg className="lp-tick" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.2 11.7 13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
