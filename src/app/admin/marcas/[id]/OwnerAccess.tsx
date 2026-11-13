'use client'

import { useState, useTransition } from 'react'
import { actionCreateBrandOwner, actionSetOwnerActive } from '@/app/admin/actions'

interface Owner {
  id: string
  email: string
  name: string
  active: boolean
}

export function OwnerAccess({ brandId, owner }: { brandId: string; owner: Owner | null }) {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState('')

  return (
    <section className="panel">
      <h2>Acceso del emprendedor</h2>
      <p className="hint">
        Con este correo el dueño de la marca entra a su propio panel y administra sus productos, sus pedidos
        y sus pagos. No ve las demás marcas.
      </p>

      {owner && (
        <div className="req ok">
          <b>{owner.email}</b>
          <label>
            <input
              type="checkbox"
              defaultChecked={owner.active}
              onChange={(e) =>
                startTransition(async () => {
                  await actionSetOwnerActive(brandId, owner.id, e.target.checked)
                })
              }
            />
            Acceso activo
          </label>
        </div>
      )}

      {notice && <p className="notice">{notice}</p>}

      <form
        action={(fd) =>
          startTransition(async () => {
            const r = await actionCreateBrandOwner(fd)
            setNotice(
              r?.ok
                ? r.reset
                  ? 'Contraseña actualizada. Entrégasela por un canal seguro.'
                  : 'Acceso creado. Entrégale el correo y la contraseña por un canal seguro.'
                : r?.error ?? 'No se pudo crear el acceso',
            )
          })
        }
      >
        <input type="hidden" name="brandId" value={brandId} />
        <div className="row">
          <label>
            Correo
            <input name="email" type="email" defaultValue={owner?.email ?? ''} required readOnly={Boolean(owner)} />
          </label>
          <label>Nombre<input name="name" defaultValue={owner?.name ?? ''} maxLength={120} /></label>
        </div>
        <label>
          {owner ? 'Nueva contraseña' : 'Contraseña'}
          <input name="password" type="password" minLength={8} required autoComplete="new-password" />
        </label>
        <button type="submit" disabled={pending}>
          {owner ? 'Cambiar contraseña' : 'Crear acceso'}
        </button>
      </form>
    </section>
  )
}
