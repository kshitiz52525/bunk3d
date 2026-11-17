import type { TeaApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA lives in this file or seed-tea.ts, flagged `seed: true`. Mock only.
export function createTea(_ctx: MockCtx): TeaApi {
  return {};
}
