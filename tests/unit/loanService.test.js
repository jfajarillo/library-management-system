const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { Store } = require('../../src/storage/store');
const { BookService } = require('../../src/services/bookService');
const { MemberService } = require('../../src/services/memberService');
const { LoanService, MAX_ACTIVE_LOANS } = require('../../src/services/loanService');
const { ValidationError, NotFoundError, ConflictError } = require('../../src/errors');

describe('LoanService', () => {
  let books;
  let members;
  let loans;
  let today;
  let member;
  let book;

  beforeEach(() => {
    const store = new Store();
    books = new BookService(store);
    members = new MemberService(store);
    today = '2026-12-01';
    loans = new LoanService(store, books, members, () => today); // fake clock
    member = members.create({ name: 'Juan', email: 'juan@example.com' });
    book = books.create({ title: 'Clean Code', author: 'Robert C. Martin', totalCopies: 2 });
  });

  test('borrowing a book creates a loan due in 14 days', () => {
    const loan = loans.borrow({ memberId: member.id, bookId: book.id });
    assert.equal(loan.borrowDate, '2026-12-01');
    assert.equal(loan.dueDate, '2026-12-15');
    assert.equal(loan.status, 'active');
  });

  test('borrowing reduces available copies', () => {
    loans.borrow({ memberId: member.id, bookId: book.id });
    assert.equal(books.get(book.id).availableCopies, 1);
  });

  test('cannot borrow when no copies are available', () => {
    const single = books.create({ title: 'Rare', author: 'X', totalCopies: 1 });
    const other = members.create({ name: 'Maria', email: 'maria@example.com' });
    loans.borrow({ memberId: member.id, bookId: single.id });
    assert.throws(() => loans.borrow({ memberId: other.id, bookId: single.id }), ConflictError);
  });

  test(`a member cannot borrow more than ${MAX_ACTIVE_LOANS} books at once`, () => {
    for (let i = 0; i < MAX_ACTIVE_LOANS; i++) {
      const b = books.create({ title: `Book ${i}`, author: 'A' });
      loans.borrow({ memberId: member.id, bookId: b.id });
    }
    const extra = books.create({ title: 'One too many', author: 'A' });
    assert.throws(() => loans.borrow({ memberId: member.id, bookId: extra.id }), /maximum/);
  });

  test('a member cannot borrow the same book twice at the same time', () => {
    loans.borrow({ memberId: member.id, bookId: book.id });
    assert.throws(() => loans.borrow({ memberId: member.id, bookId: book.id }), ConflictError);
  });

  test('borrowing requires memberId and bookId', () => {
    assert.throws(() => loans.borrow({ memberId: member.id }), ValidationError);
  });

  test('borrowing with an unknown member or book fails', () => {
    assert.throws(() => loans.borrow({ memberId: 99, bookId: book.id }), NotFoundError);
    assert.throws(() => loans.borrow({ memberId: member.id, bookId: 99 }), NotFoundError);
  });

  test('returning on time gives no fine and restores the copy', () => {
    const loan = loans.borrow({ memberId: member.id, bookId: book.id });
    today = '2026-12-10';
    const returned = loans.returnBook(loan.id);
    assert.equal(returned.fine, 0);
    assert.equal(returned.status, 'returned');
    assert.equal(books.get(book.id).availableCopies, 2);
  });

  test('returning late charges a fine', () => {
    const loan = loans.borrow({ memberId: member.id, bookId: book.id });
    const returned = loans.returnBook(loan.id, { returnDate: '2026-12-20' }); // 5 days late
    assert.equal(returned.fine, 50);
  });

  test('cannot return the same loan twice', () => {
    const loan = loans.borrow({ memberId: member.id, bookId: book.id });
    loans.returnBook(loan.id);
    assert.throws(() => loans.returnBook(loan.id), ConflictError);
  });

  test('return date cannot be before the borrow date', () => {
    const loan = loans.borrow({ memberId: member.id, bookId: book.id });
    assert.throws(() => loans.returnBook(loan.id, { returnDate: '2026-11-01' }), ValidationError);
  });

  test('a loan past its due date shows as overdue', () => {
    const loan = loans.borrow({ memberId: member.id, bookId: book.id });
    today = '2026-12-16';
    assert.equal(loans.get(loan.id).status, 'overdue');
    assert.equal(loans.list({ status: 'overdue' }).length, 1);
  });

  test('lists loans filtered by member', () => {
    const other = members.create({ name: 'Maria', email: 'maria@example.com' });
    loans.borrow({ memberId: member.id, bookId: book.id });
    loans.borrow({ memberId: other.id, bookId: book.id });
    assert.equal(loans.list({ memberId: member.id }).length, 1);
  });
});
