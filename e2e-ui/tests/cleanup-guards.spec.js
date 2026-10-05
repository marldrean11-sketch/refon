import { test, expect } from '@playwright/test'
import { assertTestCleanupAllowed } from './support-db.js'

/**
 * Guards for the destructive test-database reset.
 *
 * The reset runs automatically before every Playwright run, so these tests pin
 * the conditions under which it refuses to do anything. A regression here would
 * mean a test run could delete rows outside a local development database.
 */
test.describe('T1 test-database reset guards', () => {
  test('T1 refuses to run when NODE_ENV is production', () => {
    expect(() =>
      assertTestCleanupAllowed({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/refon',
      }),
    ).toThrow(/production/i)
  })

  test('T1 refuses to run without DATABASE_URL', () => {
    expect(() => assertTestCleanupAllowed({ NODE_ENV: 'test' })).toThrow(/DATABASE_URL/i)
  })

  test('T1 refuses to run against a non-local database host', () => {
    expect(() =>
      assertTestCleanupAllowed({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@db.production.example.com:5432/refon',
      }),
    ).toThrow(/not a local host/i)
  })

  test('T1 allows an explicit override for a non-local development database', () => {
    expect(() =>
      assertTestCleanupAllowed({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@db.example.internal:5432/refon',
        REFON_ALLOW_TEST_CLEANUP: '1',
      }),
    ).not.toThrow()
  })

  test('T1 allows a local database in a test environment', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(() =>
        assertTestCleanupAllowed({
          NODE_ENV: 'test',
          DATABASE_URL: `postgresql://user:pass@${host}:5432/refon`,
        }),
      ).not.toThrow()
    }
  })

  test('T1 refuses an unparseable DATABASE_URL rather than guessing', () => {
    expect(() =>
      assertTestCleanupAllowed({ NODE_ENV: 'test', DATABASE_URL: 'not a url' }),
    ).toThrow(/could not be parsed/i)
  })
})
