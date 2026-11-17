'use client';
import { ConsoleShell } from '@/components/kit';

// Vendor console frame. Add nav entries as pages are built.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell title="Vendor" nav={[{ href: '/vendor', label: 'Overview' }]}>{children}</ConsoleShell>;
}
