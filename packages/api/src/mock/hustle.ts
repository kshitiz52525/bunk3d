import type { HustleApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA lives in this file or seed-hustle.ts, flagged `seed: true`. Mock only.
export function createHustle(_ctx: MockCtx): HustleApi {
  return {};
}
