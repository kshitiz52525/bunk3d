import type { DiscoverApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA lives in this file or seed-discover.ts, flagged `seed: true`. Mock only.
export function createDiscover(_ctx: MockCtx): DiscoverApi {
  return {};
}
