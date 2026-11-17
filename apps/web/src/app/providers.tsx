'use client';
import { ApiProvider, createMockApi } from '@bunk3d/api';

// Frontend phase: mock adapter. Backend phase swaps this one line.
const api = createMockApi();

export function Providers({ children }: { children: React.ReactNode }) {
  return <ApiProvider api={api}>{children}</ApiProvider>;
}
