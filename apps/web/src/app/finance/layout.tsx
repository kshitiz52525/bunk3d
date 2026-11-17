'use client';
import { ConsoleShell } from '@/components/kit';

// Finance console frame. Add nav entries as pages are built.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell title="Finance" nav={[{ href: '/finance', label: 'Overview' }]}>{children}</ConsoleShell>;
}
