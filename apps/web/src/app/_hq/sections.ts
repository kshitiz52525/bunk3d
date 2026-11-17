import type { CcConsole } from '@bunk3d/api';

// Route table for the four consoles. Page ids match the API (ccNav); the first page of each console lives at the console root.
export const HQ: Record<CcConsole, { title: string; base: string; ids: string[] }> = {
  college: { title: 'College HQ', base: '/college-hq', ids: ['co1', 'co2', 'co3', 'co4', 'co5', 'co6'] },
  collab: { title: 'Collab HQ', base: '/collab-hq', ids: ['br1', 'br13', 'br14', 'br2', 'br3', 'br4', 'br5', 'br6', 'br7', 'br8', 'br9', 'br10', 'br11', 'br12'] },
  vendor: { title: 'Vendor', base: '/vendor', ids: ['vn1', 'vn2'] },
  finance: { title: 'Finance', base: '/finance', ids: ['fi1', 'fi2', 'fi3', 'fi4', 'fi5', 'fi6', 'fi7', 'fi8'] },
};
export const hrefFor = (c: CcConsole, id: string) => (id === HQ[c].ids[0] ? HQ[c].base : `${HQ[c].base}/${id}`);
