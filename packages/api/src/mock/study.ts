import type { StudyApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA lives in this file or seed-study.ts, flagged `seed: true`. Mock only.
export function createStudy(_ctx: MockCtx): StudyApi {
  return {};
}
