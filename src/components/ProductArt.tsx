const GOLD = '#A8791F'

type Motif = (c: string, g: string) => React.ReactNode

const MOTIFS: Record<string, Motif[]> = {
  accesorios: [
    (c, g) => (<>
      <circle cx="72" cy="96" r="26" fill="none" stroke={c} strokeWidth="4" />
      <circle cx="128" cy="96" r="26" fill="none" stroke={c} strokeWidth="4" />
      <path d="M50 96h44M106 96h44" stroke={g} strokeWidth="3" />
      <path d="M72 58v12M128 58v12" stroke={c} strokeWidth="3" />
    </>),
    (c, g) => (<>
      <path d="M52 62c0 34 21 58 48 58s48-24 48-58" fill="none" stroke={c} strokeWidth="3.5" />
      <circle cx="100" cy="132" r="21" fill="#fff" stroke={g} strokeWidth="3.5" />
    </>),
    (c, g) => (<>
      <path d="M40 100q15-22 30 0t30 0 30 0 30 0" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" />
      <path d="M40 100q15 22 30 0t30 0 30 0 30 0" fill="none" stroke={g} strokeWidth="6" strokeLinecap="round" />
    </>),
    (c, g) => (<>
      <path d="M62 78h76l-9 74H71z" fill={c} />
      <path d="M62 78q38-34 76 0" fill="none" stroke={g} strokeWidth="4" />
      <path d="M66 104h68M69 124h62" stroke="#fff" strokeWidth="5" opacity=".8" />
    </>),
    (c, g) => (<>
      <circle cx="100" cy="104" r="34" fill="none" stroke={c} strokeWidth="9" />
      <circle cx="100" cy="104" r="34" fill="none" stroke={g} strokeWidth="2" strokeDasharray="5 7" />
      <path d="M88 62h24l-6 12H94z" fill={g} />
    </>),
    (c, g) => (<>
      <path d="M72 78c14 16 14 30 0 40s-14-24 0-40z" fill={g} />
      <path d="M128 78c14 16 14 30 0 40s-14-24 0-40z" fill={g} />
      <path d="M72 62v16M128 62v16" stroke={c} strokeWidth="3" />
    </>),
  ],
  ropa: [
    (c, g) => (<>
      <path d="M70 62h60l18 18-14 14-8-7v57H74v-57l-8 7-14-14z" fill={c} />
      <path d="M86 62q14 14 28 0" fill="none" stroke={g} strokeWidth="3.5" />
    </>),
    (c, g) => (<>
      <path d="M78 60h44l10 22-12 8 8 54H72l8-54-12-8z" fill={c} />
      <path d="M84 112h32" stroke={g} strokeWidth="3.5" />
    </>),
    (c, g) => (<>
      <path d="M74 60h52v84h-22l-4-46-4 46H74z" fill={c} />
      <path d="M74 78h52" stroke={g} strokeWidth="3" />
      <circle cx="86" cy="70" r="3" fill={g} />
    </>),
    (c, g) => (<>
      <path d="M72 62h56l14 20-12 10v52H70V92l-12-10z" fill={c} />
      <path d="M100 62v82" stroke={g} strokeWidth="3.5" />
    </>),
  ],
  postres: [
    (c, g) => (<>
      <path d="M56 92h88v50a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8z" fill={c} />
      <path d="M56 92q22-22 44 0t44 0" fill="none" stroke={g} strokeWidth="5" />
      <path d="M100 54v26" stroke={g} strokeWidth="4" />
      <circle cx="100" cy="50" r="5" fill={g} />
    </>),
    (c, g) => (<>
      <path d="M70 104h60l-10 46H80z" fill={c} />
      <path d="M68 104q10-30 32-30t32 30z" fill={g} />
      <circle cx="100" cy="68" r="6" fill={c} />
    </>),
    (c, g) => (<>
      <circle cx="80" cy="88" r="24" fill={c} />
      <circle cx="124" cy="112" r="24" fill={c} />
      <circle cx="76" cy="82" r="4" fill={g} />
      <circle cx="88" cy="96" r="4" fill={g} />
      <circle cx="120" cy="106" r="4" fill={g} />
      <circle cx="132" cy="118" r="4" fill={g} />
    </>),
    (c, g) => (<>
      <rect x="60" y="74" width="80" height="56" rx="6" fill={c} />
      <path d="M60 102h80M87 74v56M113 74v56" stroke={g} strokeWidth="3" />
    </>),
  ],
  cosmetica: [
    (c, g) => (<>
      <rect x="86" y="98" width="28" height="48" rx="4" fill={c} />
      <path d="M90 98V66a10 10 0 0 1 20 0v32z" fill={g} />
    </>),
    (c, g) => (<>
      <rect x="78" y="84" width="44" height="66" rx="8" fill={c} />
      <rect x="90" y="58" width="20" height="26" rx="4" fill={g} />
      <path d="M86 108h28" stroke="#fff" strokeWidth="3.5" opacity=".85" />
    </>),
    (c, g) => (<>
      <ellipse cx="100" cy="118" rx="38" ry="30" fill={c} />
      <rect x="74" y="70" width="52" height="20" rx="6" fill={g} />
    </>),
    (c, g) => (<>
      <rect x="58" y="78" width="84" height="46" rx="6" fill={c} />
      <circle cx="79" cy="101" r="10" fill={g} />
      <circle cx="105" cy="101" r="10" fill="#fff" opacity=".8" />
      <circle cx="131" cy="101" r="10" fill={g} />
    </>),
  ],
  general: [
    (c, g) => (<>
      <rect x="62" y="62" width="76" height="76" rx="14" fill={c} />
      <circle cx="100" cy="100" r="18" fill={g} />
    </>),
    (c, g) => (<>
      <circle cx="100" cy="100" r="40" fill={c} />
      <path d="M78 100h44M100 78v44" stroke={g} strokeWidth="6" strokeLinecap="round" />
    </>),
    (c, g) => (<>
      <path d="M100 56l44 26v40l-44 26-44-26V82z" fill={c} />
      <path d="M100 56v52l44-26M100 108l-44-26" stroke={g} strokeWidth="3" fill="none" />
    </>),
  ],
}

export function ProductArt({
  category,
  index,
  base,
  soft,
  className,
}: {
  category: string
  index: number
  base: string
  soft: string
  className?: string
}) {
  const set = MOTIFS[category] ?? MOTIFS.general
  const draw = set[index % set.length]
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true" role="img">
      <rect width="200" height="200" fill={soft} />
      {draw(base, GOLD)}
    </svg>
  )
}
