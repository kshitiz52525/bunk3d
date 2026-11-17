'use client';
import { ConsoleShell } from '@/components/kit';

// Crew HQ console frame. Add nav entries as pages are built.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell title="Crew HQ" nav={[{ href: '/crew-hq', label: 'Overview' }]}>{children}</ConsoleShell>;
}
