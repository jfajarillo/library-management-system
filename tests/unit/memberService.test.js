const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { Store } = require('../../src/storage/store');
const { MemberService } = require('../../src/services/memberService');
const { ValidationError, NotFoundError, ConflictError } = require('../../src/errors');

describe('MemberService', () => {
  let store;
  let members;

  beforeEach(() => {
    store = new Store();
    members = new MemberService(store);
  });

  test('registers a member', () => {
    const m = members.create({ name: 'Juan Dela Cruz', email: 'juan@example.com' });
    assert.equal(m.id, 1);
    assert.equal(m.name, 'Juan Dela Cruz');
  });

  test('stores email in lowercase', () => {
    const m = members.create({ name: 'Maria', email: 'Maria@Example.COM' });
    assert.equal(m.email, 'maria@example.com');
  });

  test('rejects a member without a name', () => {
    assert.throws(() => members.create({ email: 'a@b.com' }), ValidationError);
  });

  test('rejects an invalid email', () => {
    assert.throws(() => members.create({ name: 'A', email: 'not-an-email' }), ValidationError);
  });

  test('rejects a duplicate email (case-insensitive)', () => {
    members.create({ name: 'A', email: 'same@example.com' });
    assert.throws(() => members.create({ name: 'B', email: 'SAME@example.com' }), ConflictError);
  });

  test('updates a member name', () => {
    const m = members.create({ name: 'Old', email: 'x@example.com' });
    assert.equal(members.update(m.id, { name: 'New' }).name, 'New');
  });

  test('keeping your own email on update is allowed', () => {
    const m = members.create({ name: 'A', email: 'x@example.com' });
    assert.doesNotThrow(() => members.update(m.id, { email: 'x@example.com' }));
  });

  test('throws NotFoundError for an unknown id', () => {
    assert.throws(() => members.get(42), NotFoundError);
  });

  test('cannot delete a member who still has borrowed books', () => {
    const m = members.create({ name: 'A', email: 'x@example.com' });
    store.insert('loans', { bookId: 1, memberId: m.id, returnDate: null });
    assert.throws(() => members.remove(m.id), ConflictError);
  });
});
