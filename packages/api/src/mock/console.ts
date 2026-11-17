import type { ConsoleApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA lives in this file or seed-console.ts, flagged `seed: true`. Mock only.
export function createConsole(_ctx: MockCtx): ConsoleApi {
  return {};
}
