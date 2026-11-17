'use client';
import { ConsoleShell } from '@/components/kit';

// Collab HQ console frame. Add nav entries as pages are built.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell title="Collab HQ" nav={[{ href: '/collab-hq', label: 'Overview' }]}>{children}</ConsoleShell>;
}
