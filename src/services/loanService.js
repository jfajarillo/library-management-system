// Business logic for borrowing and returning books (the core of the system).
const { ValidationError, NotFoundError, ConflictError } = require('../errors');
const { addDays, isValidDate, today: realToday } = require('../utils/dates');
const { calculateFine } = require('./fineCalculator');

const LOAN_DAYS = 14;          // books are due 14 days after borrowing
const MAX_ACTIVE_LOANS = 3;    // a member can hold at most 3 books at once

class LoanService {
  // `clock` is injected so tests can control "today" (Dependency Injection).
  constructor(store, bookService, memberService, clock = realToday) {
    this.store = store;
    this.books = bookService;
    this.members = memberService;
    this.clock = clock;
  }

  withStatus(loan) {
    const status = loan.returnDate ? 'returned' : (this.clock() > loan.dueDate ? 'overdue' : 'active');
    return { ...loan, status };
  }

  list({ status, memberId } = {}) {
    let loans = this.store.all('loans').map((l) => this.withStatus(l));
    if (memberId !== undefined) loans = loans.filter((l) => l.memberId === Number(memberId));
    if (status === 'active') loans = loans.filter((l) => l.status !== 'returned');
    else if (status) loans = loans.filter((l) => l.status === status);
    return loans;
  }

  get(id) {
    const loan = this.store.findById('loans', id);
    if (!loan) throw new NotFoundError(`Loan ${id} not found`);
    return this.withStatus(loan);
  }

  activeLoansOf(memberId) {
    return this.store.all('loans').filter((l) => l.memberId === memberId && !l.returnDate);
  }

  borrow({ memberId, bookId } = {}) {
    if (memberId === undefined || bookId === undefined) {
      throw new ValidationError('memberId and bookId are required');
    }
    const member = this.members.get(memberId);
    const book = this.books.get(bookId);

    if (book.availableCopies < 1) {
      throw new ConflictError(`"${book.title}" has no available copies`);
    }
    const active = this.activeLoansOf(member.id);
    if (active.length >= MAX_ACTIVE_LOANS) {
      throw new ConflictError(`Member already has the maximum of ${MAX_ACTIVE_LOANS} borrowed books`);
    }
    if (active.some((l) => l.bookId === book.id)) {
      throw new ConflictError('Member already borrowed this book');
    }

    const borrowDate = this.clock();
    this.store.update('books', book.id, { availableCopies: book.availableCopies - 1 });
    const loan = this.store.insert('loans', {
      memberId: member.id,
      bookId: book.id,
      borrowDate,
      dueDate: addDays(borrowDate, LOAN_DAYS),
      returnDate: null,
      fine: 0,
    });
    return this.withStatus(loan);
  }

  returnBook(id, { returnDate } = {}) {
    const loan = this.store.findById('loans', id);
    if (!loan) throw new NotFoundError(`Loan ${id} not found`);
    if (loan.returnDate) throw new ConflictError('This loan has already been returned');

    const date = returnDate || this.clock();
    if (!isValidDate(date)) throw new ValidationError('returnDate must be in YYYY-MM-DD format');
    if (date < loan.borrowDate) throw new ValidationError('returnDate cannot be before the borrow date');

    const book = this.store.findById('books', loan.bookId);
    if (book) this.store.update('books', book.id, { availableCopies: book.availableCopies + 1 });

    const updated = this.store.update('loans', loan.id, {
      returnDate: date,
      fine: calculateFine(loan.dueDate, date),
    });
    return this.withStatus(updated);
  }
}

module.exports = { LoanService, LOAN_DAYS, MAX_ACTIVE_LOANS };
