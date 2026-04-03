'use client';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const BeamBackground = dynamic(
  () => import('@/components/ui/beam-background').then(m => ({ default: m.BeamBackground })),
  { ssr: false }
);

export function ConditionalBeamBg() {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard')) return null;
  return <BeamBackground />;
}
