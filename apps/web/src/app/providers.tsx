'use client';
import { ApiProvider, createMockApi } from '@bunk3d/api';
import { StaffProvider } from '@/components/staff';

// Frontend phase: mock adapter. Backend phase swaps this one line.
const api = createMockApi();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApiProvider api={api}>
      <StaffProvider>{children}</StaffProvider>
    </ApiProvider>
  );
}
