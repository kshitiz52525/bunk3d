import type { BunkApi } from '../contract';
import { createCtx, type MockOptions } from './ctx';
import { createIdentity } from './identity';
import { createTea } from './tea';
import { createStudy } from './study';
import { createPoppin } from './poppin';
import { createCrew } from './crew';
import { createDm } from './dm';
import { createDiscover } from './discover';
import { createYou } from './you';
import { createSafety } from './safety';
import { createHustle } from './hustle';
import { createConsole } from './console';

export type { MockOptions } from './ctx';

export function createMockApi(opts: MockOptions = {}): BunkApi {
  const ctx = createCtx(opts);
  return {
    ...createIdentity(ctx),
    tea: createTea(ctx),
    study: createStudy(ctx),
    poppin: createPoppin(ctx),
    crew: createCrew(ctx),
    dm: createDm(ctx),
    discover: createDiscover(ctx),
    you: createYou(ctx),
    safety: createSafety(ctx),
    hustle: createHustle(ctx),
    console: createConsole(ctx),
  };
}
