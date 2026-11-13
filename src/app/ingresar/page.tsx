import { actionLogin } from './actions'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="admin login">
      <div className="panel">
        <h1>Entrar</h1>
        <p className="muted">
          Con tu correo entras a tu tienda. Si administras varias marcas, entras al panel de asesoría.
        </p>
        <form action={actionLogin}>
          <label>
            Correo
            <input name="email" type="email" autoComplete="username" required autoFocus />
          </label>
          <label>
            Contraseña
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && <p className="error">Correo o contraseña incorrectos.</p>}
          <button type="submit">Entrar</button>
        </form>
      </div>
    </main>
  )
}
