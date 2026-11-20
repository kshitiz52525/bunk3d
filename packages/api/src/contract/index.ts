import type { IdentityApi } from './identity';
import type { TeaApi } from './tea';
import type { StudyApi } from './study';
import type { PoppinApi } from './poppin';
import type { CrewApi } from './crew';
import type { DmApi } from './dm';
import type { DiscoverApi } from './discover';
import type { YouApi } from './you';
import type { SafetyApi } from './safety';
import type { HustleApi } from './hustle';
import type { ConsoleApi } from './console';
import type { StaffApi } from './staff';

export * from './identity';
export * from './tea';
export * from './study';
export * from './poppin';
export * from './crew';
export * from './dm';
export * from './discover';
export * from './you';
export * from './safety';
export * from './hustle';
export * from './console';
export * from './staff';

/** The whole backend surface. The mock adapter implements it now; the Supabase adapter later. */
export interface BunkApi extends IdentityApi {
  /** 'mock' while the frontend runs on seed data; consoles label seed data only in this mode. */
  mode: 'mock' | 'live';
  staff: StaffApi;
  tea: TeaApi;
  study: StudyApi;
  poppin: PoppinApi;
  crew: CrewApi;
  dm: DmApi;
  discover: DiscoverApi;
  you: YouApi;
  safety: SafetyApi;
  hustle: HustleApi;
  console: ConsoleApi;
}
