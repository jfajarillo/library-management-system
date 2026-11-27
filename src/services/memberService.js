// Business logic for library members.
const { ValidationError, NotFoundError, ConflictError } = require('../errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class MemberService {
  constructor(store) {
    this.store = store;
  }

  validate(data, { partial = false } = {}) {
    const clean = {};

    if (!partial || data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim() === '') {
        throw new ValidationError('Name is required');
      }
      clean.name = data.name.trim();
    }

    if (!partial || data.email !== undefined) {
      if (typeof data.email !== 'string' || !EMAIL_RE.test(data.email.trim())) {
        throw new ValidationError('A valid email is required');
      }
      clean.email = data.email.trim().toLowerCase();
    }

    return clean;
  }

  ensureUniqueEmail(email, ignoreId = null) {
    if (!email) return;
    const dup = this.store.all('members').find((m) => m.email === email && m.id !== ignoreId);
    if (dup) throw new ConflictError(`Email ${email} is already registered`);
  }

  list() {
    return this.store.all('members');
  }

  get(id) {
    const member = this.store.findById('members', id);
    if (!member) throw new NotFoundError(`Member ${id} not found`);
    return member;
  }

  create(data) {
    const clean = this.validate(data);
    this.ensureUniqueEmail(clean.email);
    return this.store.insert('members', clean);
  }

  update(id, data) {
    const member = this.get(id);
    const clean = this.validate(data, { partial: true });
    this.ensureUniqueEmail(clean.email, member.id);
    return this.store.update('members', member.id, clean);
  }

  remove(id) {
    const member = this.get(id);
    const active = this.store.all('loans').some((l) => l.memberId === member.id && !l.returnDate);
    if (active) throw new ConflictError('Cannot delete a member who still has borrowed books');
    this.store.remove('members', member.id);
  }
}

module.exports = { MemberService };
