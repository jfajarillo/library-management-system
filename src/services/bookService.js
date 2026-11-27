// Business logic for books.
const { ValidationError, NotFoundError, ConflictError } = require('../errors');

class BookService {
  constructor(store) {
    this.store = store;
  }

  validate(data, { partial = false } = {}) {
    const clean = {};

    if (!partial || data.title !== undefined) {
      if (typeof data.title !== 'string' || data.title.trim() === '') {
        throw new ValidationError('Title is required');
      }
      clean.title = data.title.trim();
    }

    if (!partial || data.author !== undefined) {
      if (typeof data.author !== 'string' || data.author.trim() === '') {
        throw new ValidationError('Author is required');
      }
      clean.author = data.author.trim();
    }

    if (data.isbn !== undefined && data.isbn !== null && data.isbn !== '') {
      const isbn = String(data.isbn).replace(/[-\s]/g, '');
      if (!/^(\d{10}|\d{13}|\d{9}X)$/i.test(isbn)) {
        throw new ValidationError('ISBN must be 10 or 13 digits');
      }
      clean.isbn = isbn;
    } else if (!partial) {
      clean.isbn = null;
    }

    if (!partial || data.totalCopies !== undefined) {
      const copies = data.totalCopies === undefined ? 1 : Number(data.totalCopies);
      if (!Number.isInteger(copies) || copies < 1) {
        throw new ValidationError('Total copies must be a whole number of at least 1');
      }
      clean.totalCopies = copies;
    }

    return clean;
  }

  ensureUniqueIsbn(isbn, ignoreId = null) {
    if (!isbn) return;
    const dup = this.store.all('books').find((b) => b.isbn === isbn && b.id !== ignoreId);
    if (dup) throw new ConflictError(`A book with ISBN ${isbn} already exists`);
  }

  list({ search } = {}) {
    const books = this.store.all('books');
    if (!search) return books;
    const q = search.toLowerCase();
    return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }

  get(id) {
    const book = this.store.findById('books', id);
    if (!book) throw new NotFoundError(`Book ${id} not found`);
    return book;
  }

  create(data) {
    const clean = this.validate(data);
    this.ensureUniqueIsbn(clean.isbn);
    return this.store.insert('books', { ...clean, availableCopies: clean.totalCopies });
  }

  update(id, data) {
    const book = this.get(id);
    const clean = this.validate(data, { partial: true });
    this.ensureUniqueIsbn(clean.isbn, book.id);

    if (clean.totalCopies !== undefined) {
      const borrowed = book.totalCopies - book.availableCopies;
      if (clean.totalCopies < borrowed) {
        throw new ConflictError(`Cannot set total copies below the ${borrowed} currently borrowed`);
      }
      clean.availableCopies = clean.totalCopies - borrowed;
    }

    return this.store.update('books', book.id, clean);
  }

  remove(id) {
    const book = this.get(id);
    const active = this.store.all('loans').some((l) => l.bookId === book.id && !l.returnDate);
    if (active) throw new ConflictError('Cannot delete a book that is currently borrowed');
    this.store.remove('books', book.id);
  }
}

module.exports = { BookService };
