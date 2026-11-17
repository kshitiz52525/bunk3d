'use client';
import { ConsoleShell } from '@/components/kit';
import { ClubProvider } from '../_components/club';

const CREW_NAV = [
  { href: '/crew-hq', label: 'Dashboard' },
  { href: '/crew-hq/members', label: 'Members' },
  { href: '/crew-hq/roles', label: 'Roles' },
  { href: '/crew-hq/events', label: 'Events' },
  { href: '/crew-hq/check-in', label: 'Check-in scanner' },
  { href: '/crew-hq/tasks', label: 'Tasks board' },
  { href: '/crew-hq/announcements', label: 'Announcements' },
  { href: '/crew-hq/quests', label: 'Quests (wave 2)' },
  { href: '/crew-hq/gigs', label: 'Club gigs (wave 3)' },
  { href: '/crew-hq/funds', label: 'Club funds (wave 3)' },
  { href: '/crew-hq/collabs', label: 'Brand collabs (wave 4)' },
  { href: '/crew-hq/letters', label: 'Letter requests (wave 4)' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell title="Crew HQ" nav={CREW_NAV}><ClubProvider>{children}</ClubProvider></ConsoleShell>;
}
