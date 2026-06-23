'use client';

import { Building2 } from 'lucide-react';

/**
 * PROMÉTHÉE — CabinetLogo : rendu UNIFIÉ du logo du cabinet.
 * Remplace les 3 implémentations dispersées (sidebar PC, topbar mobile, drawer
 * mobile) qui utilisaient des tailles/img différentes. Un seul composant piloté
 * par `size`/`iconSize` pour un rendu cohérent partout.
 */
interface CabinetLogoProps {
  logoUrl?: string | null;
  color?: string;
  size?: number;       // taille du conteneur (px) — défaut 36
  iconSize?: number;   // taille de l'icône/image interne — défaut ~size/2
  rounded?: string;    // classe d'arrondi tailwind — défaut rounded-xl
}

export default function CabinetLogo({
  logoUrl,
  color = '#10b981',
  size = 36,
  iconSize,
  rounded = 'rounded-xl',
}: CabinetLogoProps) {
  const icon = iconSize ?? Math.round(size * 0.5);
  return (
    <div
      className={`${rounded} flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: color, width: size, height: size }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="rounded object-contain" style={{ width: icon, height: icon }} />
      ) : (
        <Building2 size={icon} className="text-white" strokeWidth={2} />
      )}
    </div>
  );
}
