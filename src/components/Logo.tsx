import { useId, useState } from 'react';

export type LogoVariant = 'symbol' | 'badge' | 'full' | 'svg';

export interface LogoProps {
  /** Taille en pixels ou chaîne CSS (ex: 36, "48px", "100%"). Défaut: 36. */
  size?: number | string;
  /**
   * Variante visuelle :
   * - 'symbol' : symbole officiel (A or + anneau orbital cyan + ondes) sans texte, idéal pour icônes et en-têtes
   * - 'badge'  : badge squircle officiel avec lueur bleue et fond nuit
   * - 'full'   : logo officiel complet (badge + typographie A.MS + ARKANOS MUSIC SYNC)
   * - 'svg'    : vecteur Arkanos géométrique pur (fallback sans raster)
   */
  variant?: LogoVariant;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

/**
 * Logo officiel A.MS — Arkanos Music Sync.
 * Rendu responsive et sans déformation (ratio 1:1, object-fit: contain).
 */
export function Logo({
  size = 36,
  variant = 'symbol',
  className = '',
  alt = 'A.MS — Arkanos Music Sync',
  style,
}: LogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const dimension = typeof size === 'number' ? `${size}px` : size;
  const numSize = typeof size === 'number' ? size : parseInt(String(size), 10) || 36;

  // Si variante SVG demandée explicitement ou si l'image raster a échoué (fallback)
  if (variant === 'svg' || imageFailed) {
    return (
      <VectorLogo
        size={numSize}
        className={className}
        alt={alt}
        style={{ width: dimension, height: dimension, ...style }}
      />
    );
  }

  // Sélection de la ressource optimale selon variante et résolution
  let src = '/branding/ams-symbol.png';
  if (variant === 'full') {
    src = '/branding/ams-logo.png';
  } else if (variant === 'badge') {
    src = '/branding/ams-badge.png';
  } else if (variant === 'symbol') {
    // Utiliser la variante pré-redimensionnée pour les très petites tailles
    src = numSize <= 64 ? '/branding/ams-symbol-64.png' : '/branding/ams-symbol.png';
  }

  return (
    <img
      src={src}
      alt={alt}
      width={numSize}
      height={numSize}
      className={`ams-logo ams-logo--${variant} ${className}`}
      style={{
        width: dimension,
        height: dimension,
        aspectRatio: '1 / 1',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      loading="eager"
      decoding="async"
      onError={() => setImageFailed(true)}
    />
  );
}

/**
 * Signature vectorielle SVG — repli sans dépendance externe.
 */
function VectorLogo({
  size,
  className = '',
  alt,
  style,
}: {
  size: number;
  className?: string;
  alt: string;
  style?: React.CSSProperties;
}) {
  const gradientId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={alt}
      className={`ams-logo ams-logo--svg ${className}`}
      style={{
        aspectRatio: '1 / 1',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
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

/** Signature textuelle « ARKANOS » — system font, espacée, dorée. */
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
