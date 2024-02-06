import { describe, expect, it } from 'vitest';
import { TransactionalLedgerDatabase } from '../../src/server/db/client';
import { buildDeterministic2024SeedState } from '../../src/server/db/seed-data';
import {
  AuthService,
  assertPermission,
  hasPermission,
  hashPasswordSync,
  verifyPasswordSync,
} from '../../src/server/auth/auth.service';

describe('M03: Authentication, Session Cookies, CSRF & Household RBAC', () => {
  it('hashes and verifies passwords with bcryptjs', () => {
    const hash = hashPasswordSync('SecurePass2024!');
    expect(verifyPasswordSync('SecurePass2024!', hash)).toBe(true);
    expect(verifyPasswordSync('WrongPassword', hash)).toBe(false);
  });

  it('authenticates seeded household users, issues CSRF token, and enforces CSRF header', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AuthService(testDb);

    const loginRes = service.login({
      email: 'amina.tariq@household.local',
      password: 'Household2024!',
    });

    expect(loginRes.user.role).toBe('OWNER');
    expect(loginRes.session.csrfToken).toContain('csrf-');

    const verifiedUser = service.verifySessionAndCsrf(
      loginRes.session.id,
      loginRes.session.csrfToken,
      true
    );
    expect(verifiedUser.id).toBe('usr-owner-01');

    expect(() =>
      service.verifySessionAndCsrf(loginRes.session.id, 'invalid-csrf-token', true)
    ).toThrow(/Missing or invalid X-CSRF-Token/);

    expect(service.logout(loginRes.session.id)).toBe(true);
    expect(() => service.verifySessionAndCsrf(loginRes.session.id)).toThrow(
      /not found or has been revoked/
    );
  });

  it('enforces RBAC permissions across OWNER, MEMBER, and VIEWER roles', () => {
    expect(hasPermission('OWNER', 'household:manage_roles')).toBe(true);
    expect(hasPermission('MEMBER', 'ledger:write')).toBe(true);
    expect(hasPermission('MEMBER', 'household:manage_roles')).toBe(false);
    expect(hasPermission('VIEWER', 'ledger:read')).toBe(true);
    expect(hasPermission('VIEWER', 'ledger:write')).toBe(false);

    expect(() =>
      assertPermission({ role: 'VIEWER', displayName: 'Nadia Bookkeeper' }, 'ledger:write')
    ).toThrow(/not permitted/);
  });

  it('allows OWNER to update household member roles and blocks non-OWNER users', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AuthService(testDb);

    expect(() =>
      service.updateHouseholdRole('usr-viewer-03', {
        targetUserId: 'usr-member-02',
        newRole: 'OWNER',
      })
    ).toThrow(/not permitted/);

    const updated = service.updateHouseholdRole('usr-owner-01', {
      targetUserId: 'usr-viewer-03',
      newRole: 'MEMBER',
    });
    expect(updated.role).toBe('MEMBER');
  });

  it('enforces sliding-window rate limiting on repeated login attempts', () => {
    const testDb = new TransactionalLedgerDatabase(buildDeterministic2024SeedState());
    const service = new AuthService(testDb);

    for (let i = 0; i < 8; i++) {
      expect(() =>
        service.login(
          { email: 'amina.tariq@household.local', password: 'WrongPassword123' },
          1708000000000 + i * 100
        )
      ).toThrow(/Invalid email or password/);
    }

    expect(() =>
      service.login(
        { email: 'amina.tariq@household.local', password: 'WrongPassword123' },
        1708000001000
      )
    ).toThrow(/Rate limit exceeded/);
  });
});
