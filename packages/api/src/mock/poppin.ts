import type { PoppinApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA lives in this file or seed-poppin.ts, flagged `seed: true`. Mock only.
export function createPoppin(_ctx: MockCtx): PoppinApi {
  return {};
}
