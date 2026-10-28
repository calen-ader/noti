'use client';

import { useEffect, useRef } from 'react';
import { mountNotiHero } from '@/lib/logo/noti-hero';

export function HeroLogo({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = mountNotiHero(ref.current!, { label: 'Noti' });
    return () => {
      hero.destroy();
      hero.svg.remove();
    };
  }, []);

  return <div ref={ref} className={className} />;
}
