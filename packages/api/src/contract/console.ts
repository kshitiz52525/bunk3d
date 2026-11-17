// Console domain contract. Composed from per-area files so workers do not collide.
// Each method must say who may call it and what RLS must enforce (see identity.ts for the style).
import type { CrewOpsApi } from './console-crew-ops';
import type { CollegeCollabApi } from './console-college-collab';

export * from './console-crew-ops';
export * from './console-college-collab';
export type ConsoleApi = CrewOpsApi & CollegeCollabApi;
