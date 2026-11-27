const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { Store } = require('../../src/storage/store');
const { BookService } = require('../../src/services/bookService');
const { ValidationError, NotFoundError, ConflictError } = require('../../src/errors');

describe('BookService', () => {
  let store;
  let books;

  beforeEach(() => {
    store = new Store();            // in-memory, fresh for every test
    books = new BookService(store);
  });

  test('creates a book with all copies available', () => {
    const book = books.create({ title: 'Clean Code', author: 'Robert C. Martin', totalCopies: 2 });
    assert.equal(book.id, 1);
    assert.equal(book.totalCopies, 2);
    assert.equal(book.availableCopies, 2);
  });

  test('defaults to 1 copy when totalCopies is not given', () => {
    const book = books.create({ title: 'Book', author: 'Author' });
    assert.equal(book.totalCopies, 1);
  });

  test('trims whitespace from title and author', () => {
    const book = books.create({ title: '  Clean Code ', author: ' Uncle Bob ' });
    assert.equal(book.title, 'Clean Code');
    assert.equal(book.author, 'Uncle Bob');
  });

  test('rejects a book without a title', () => {
    assert.throws(() => books.create({ author: 'Someone' }), ValidationError);
  });

  test('rejects a book without an author', () => {
    assert.throws(() => books.create({ title: 'Untitled' }), ValidationError);
  });

  test('rejects zero or negative copies', () => {
    assert.throws(() => books.create({ title: 'A', author: 'B', totalCopies: 0 }), ValidationError);
    assert.throws(() => books.create({ title: 'A', author: 'B', totalCopies: -2 }), ValidationError);
  });

  test('rejects an invalid ISBN', () => {
    assert.throws(() => books.create({ title: 'A', author: 'B', isbn: '123' }), ValidationError);
  });

  test('rejects a duplicate ISBN', () => {
    books.create({ title: 'A', author: 'B', isbn: '9780132350884' });
    assert.throws(() => books.create({ title: 'C', author: 'D', isbn: '978-0-13-235088-4' }), ConflictError);
  });

  test('searches by title or author (case-insensitive)', () => {
    books.create({ title: 'Noli Me Tangere', author: 'Jose Rizal' });
    books.create({ title: 'Clean Code', author: 'Robert C. Martin' });
    assert.equal(books.list({ search: 'rizal' }).length, 1);
    assert.equal(books.list({ search: 'CLEAN' }).length, 1);
    assert.equal(books.list().length, 2);
  });

  test('throws NotFoundError for an unknown id', () => {
    assert.throws(() => books.get(99), NotFoundError);
  });

  test('updates a book title', () => {
    const book = books.create({ title: 'Old', author: 'B' });
    assert.equal(books.update(book.id, { title: 'New' }).title, 'New');
  });

  test('updating total copies keeps borrowed copies in mind', () => {
    const book = books.create({ title: 'A', author: 'B', totalCopies: 3 });
    store.update('books', book.id, { availableCopies: 1 }); // 2 borrowed
    const updated = books.update(book.id, { totalCopies: 5 });
    assert.equal(updated.availableCopies, 3);
    assert.throws(() => books.update(book.id, { totalCopies: 1 }), ConflictError);
  });

  test('deletes a book', () => {
    const book = books.create({ title: 'A', author: 'B' });
    books.remove(book.id);
    assert.equal(books.list().length, 0);
  });

  test('cannot delete a book that is currently borrowed', () => {
    const book = books.create({ title: 'A', author: 'B' });
    store.insert('loans', { bookId: book.id, memberId: 1, returnDate: null });
    assert.throws(() => books.remove(book.id), ConflictError);
  });
});
