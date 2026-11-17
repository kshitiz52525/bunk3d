import type { ConsoleApi } from '../contract';
import type { MockCtx } from './ctx';
import { createCrewOps } from './console-crew-ops';
import { createCollegeCollab } from './console-college-collab';

// SEED DATA lives in the per-area files, flagged `seed: true`. Mock only.
export function createConsole(ctx: MockCtx): ConsoleApi {
  return { ...createCrewOps(ctx), ...createCollegeCollab(ctx) };
}
