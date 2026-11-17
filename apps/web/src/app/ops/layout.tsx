'use client';
import { ConsoleShell } from '@/components/kit';

// Ops console frame. Add nav entries as pages are built.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell title="Ops" nav={[{ href: '/ops', label: 'Overview' }]}>{children}</ConsoleShell>;
}
