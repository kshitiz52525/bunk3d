import { describe, expect, it } from 'vitest';
import { CONSOLES, STAFF_ROLES, canAccess, consoleFor, consoleOfPath, homePath, isStaffRole } from '../src';

describe('staff access', () => {
  it('every role belongs to exactly one console and no other', () => {
    for (const r of STAFF_ROLES) {
      const own = consoleFor(r);
      expect(CONSOLES.filter((c) => canAccess(r, c))).toEqual([own]);
    }
  });
  it('every console has at least one role', () => {
    for (const c of CONSOLES) expect(STAFF_ROLES.some((r) => consoleFor(r) === c)).toBe(true);
  });
  it('maps paths to consoles and home paths', () => {
    expect(consoleOfPath('/ops/users')).toBe('ops');
    expect(consoleOfPath('/crew-hq')).toBe('crew-hq');
    expect(consoleOfPath('/login')).toBeNull();
    expect(consoleOfPath('/')).toBeNull();
    expect(homePath('finance_approver')).toBe('/finance');
  });
  it('rejects unknown roles', () => {
    expect(isStaffRole('ops')).toBe(true);
    expect(isStaffRole('admin')).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});
