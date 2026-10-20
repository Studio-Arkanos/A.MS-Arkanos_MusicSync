import { useId } from 'react';

/**
 * Signature visuelle A.MS — « système Arkanos ».
 * Hexagone système + « A » angulaire, or électrique.
 * SVG vectoriel pur : aucune dépendance, aucun
 * raster, net à toute densité.
 */
export function Logo({ size = 36 }: { size?: number }) {
  const gradientId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="A.MS — Arkanos Music Sync"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor="#f0d060" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      {/* Hexagone système */}
      <polygon
        points="24,3 42,13.5 42,34.5 24,45 6,34.5 6,13.5"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
      />
      {/* « A » angulaire — signature Arkanos */}
      <path
        d="M24 12 L33 36 H28.5 L24 23.5 L19.5 36 H15 Z"
        fill={`url(#${gradientId})`}
      />
      {/* Entaille système */}
      <rect x="22.4" y="26" width="3.2" height="6" fill="#0b1220" />
    </svg>
  );
}

/** Signature textuelle « ARKANOS » — system font,
 *  espacée, dorée. */
export function ArkanosSignature({ size = 11 }: { size?: number }) {
  return (
    <span
      className="arkanos-signature"
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      ARKANOS
    </span>
  );
}
