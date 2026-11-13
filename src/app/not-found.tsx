export default function NotFound() {
  return (
    <main className="locked">
      <svg className="lock" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="none" stroke="#9A8B96" strokeWidth="2.5" />
        <path d="M17 17l14 14M31 17L17 31" stroke="#9A8B96" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h1>Esta tienda no existe</h1>
      <p>Revisa la dirección e inténtalo de nuevo.</p>
    </main>
  )
}
