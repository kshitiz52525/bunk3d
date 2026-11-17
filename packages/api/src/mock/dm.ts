import type { DmApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA lives in this file or seed-dm.ts, flagged `seed: true`. Mock only.
export function createDm(_ctx: MockCtx): DmApi {
  return {};
}
