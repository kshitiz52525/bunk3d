import type { SafetyApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA lives in this file or seed-safety.ts, flagged `seed: true`. Mock only.
export function createSafety(_ctx: MockCtx): SafetyApi {
  return {};
}
