'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function AOSProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  useEffect(() => {
    if (isDashboard) return;

    import('aos').then((AOS) => {
      // @ts-ignore - CSS side-effect import
      import('aos/dist/aos.css');
      AOS.default.init({
        duration: 800,
        once: false,
        easing: 'ease-out-cubic',
        offset: 50,
        mirror: true,
      });
    });
  }, [isDashboard]);

  return <>{children}</>;
}
