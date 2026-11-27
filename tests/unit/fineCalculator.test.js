const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateFine, daysLate, MAX_FINE } = require('../../src/services/fineCalculator');

describe('Fine calculator', () => {
  test('no fine when returned before the due date', () => {
    assert.equal(calculateFine('2026-12-10', '2026-12-05'), 0);
  });

  test('no fine when returned exactly on the due date', () => {
    assert.equal(calculateFine('2026-12-10', '2026-12-10'), 0);
  });

  test('PHP 10 per day late', () => {
    assert.equal(calculateFine('2026-12-10', '2026-12-13'), 30);
  });

  test('counts days correctly across months and years', () => {
    assert.equal(daysLate('2026-12-30', '2027-01-02'), 3);
  });

  test('fine is capped at the maximum', () => {
    assert.equal(calculateFine('2026-01-01', '2026-12-31'), MAX_FINE);
  });

  test('rejects badly formatted dates', () => {
    assert.throws(() => calculateFine('12/10/2026', '2026-12-13'), /YYYY-MM-DD/);
  });
});
