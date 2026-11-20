// Console staff: who may open which console. Pure rules; the backend enforces the same table.

export const CONSOLES = ['crew-hq', 'college-hq', 'collab-hq', 'vendor', 'finance', 'ops'] as const;
export type ConsoleId = (typeof CONSOLES)[number];

export const STAFF_ROLES = [
  'club_lead', 'club_coordinator',
  'college_admin',
  'brand_owner', 'brand_member',
  'vendor',
  'finance', 'finance_approver',
  'ops', 'ops_lead',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const ROLE_CONSOLE: Record<StaffRole, ConsoleId> = {
  club_lead: 'crew-hq', club_coordinator: 'crew-hq',
  college_admin: 'college-hq',
  brand_owner: 'collab-hq', brand_member: 'collab-hq',
  vendor: 'vendor',
  finance: 'finance', finance_approver: 'finance',
  ops: 'ops', ops_lead: 'ops',
};

export const CONSOLE_NAMES: Record<ConsoleId, string> = {
  'crew-hq': 'Crew HQ', 'college-hq': 'College HQ', 'collab-hq': 'Collab HQ', vendor: 'Vendor', finance: 'Finance', ops: 'Ops',
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  club_lead: 'Club lead', club_coordinator: 'Club coordinator',
  college_admin: 'College admin',
  brand_owner: 'Brand owner', brand_member: 'Brand member',
  vendor: 'Vendor',
  finance: 'Finance', finance_approver: 'Finance approver',
  ops: 'Operations', ops_lead: 'Operations lead',
};

/** Each role belongs to exactly one console. */
export function consoleFor(role: StaffRole): ConsoleId {
  return ROLE_CONSOLE[role];
}
export function canAccess(role: StaffRole, console: ConsoleId): boolean {
  return ROLE_CONSOLE[role] === console;
}
export function homePath(role: StaffRole): string {
  return `/${ROLE_CONSOLE[role]}`;
}
/** Console id for a request path like "/ops/users", or null when the path is not a console. */
export function consoleOfPath(pathname: string): ConsoleId | null {
  const first = pathname.split('/')[1] ?? '';
  return (CONSOLES as readonly string[]).includes(first) ? (first as ConsoleId) : null;
}
export function isStaffRole(v: unknown): v is StaffRole {
  return typeof v === 'string' && (STAFF_ROLES as readonly string[]).includes(v);
}

/** Only these roles can approve or run money-moving and wave-gating actions. */
export const PRIVILEGED_ROLES: readonly StaffRole[] = ['finance_approver', 'ops_lead', 'club_lead', 'brand_owner'];
export const isPrivileged = (role: StaffRole) => PRIVILEGED_ROLES.includes(role);

export const SESSION_HOURS = 12;
