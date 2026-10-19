import type { SVGProps } from 'react';

/** Icônes SVG inline (aucune dépendance : performances entrée de gamme). */

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
}

export function HomeIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

export function PlaylistIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4 6h16M4 12h16M4 18h9" />
      <circle cx="18" cy="18" r="3" />
    </svg>
  );
}

export function SearchIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function LibraryIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4 4v16" />
      <path d="M8 4v16" />
      <path d="M12 5l6 14" />
      <path d="M18 5l-1 4M19 12l-1 4" opacity=".0" />
    </svg>
  );
}

export function DownloadIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

export function HistoryIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function SettingsIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </svg>
  );
}

export function MusicIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function PlayIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PauseIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SkipNextIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M6 4.5v15l10-7.5z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </svg>
  );
}

export function SkipPreviousIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M18 4.5v15L8 12z" fill="currentColor" stroke="none" />
      <path d="M6 5v14" />
    </svg>
  );
}

export function HeartIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 20s-7.5-4.7-9.3-9C1.4 7.7 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.2 4.3 6.5-1.8 4.3-9.3 9-9.3 9z" />
    </svg>
  );
}
