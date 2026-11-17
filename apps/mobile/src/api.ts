import { createMockApi } from '@bunk3d/api';

// Frontend phase: the mock adapter. Backend phase swaps this one line for the Supabase adapter.
export const api = createMockApi();
