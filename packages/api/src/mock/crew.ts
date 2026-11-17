import type { CrewApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA lives in this file or seed-crew.ts, flagged `seed: true`. Mock only.
export function createCrew(_ctx: MockCtx): CrewApi {
  return {};
}
