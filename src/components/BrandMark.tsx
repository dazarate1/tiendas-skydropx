export function BrandMark({ name, base, size = 56 }: { name: string; base: string; size?: number }) {
  const initial = (name.trim()[0] ?? 'T').toUpperCase()
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true" className="mark">
      <circle cx="28" cy="28" r="26" fill="none" stroke={base} strokeWidth="1.2" />
      <circle cx="28" cy="28" r="21" fill={base} />
      <text
        x="28"
        y="36"
        textAnchor="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontSize="26"
        fontWeight="600"
        fill="#fff"
      >
        {initial}
      </text>
      <circle cx="42" cy="15" r="2.4" fill="#A8791F" />
    </svg>
  )
}
