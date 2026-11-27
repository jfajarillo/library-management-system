// Integration tests: start the real HTTP server (with in-memory data) and call
// the API exactly the way Postman or the web page would.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');

describe('Library API (integration)', () => {
  let server;
  let baseUrl;
  let today = '2026-12-01';

  before(async () => {
    ({ server } = createApp({ clock: () => today }));
    await new Promise((resolve) => server.listen(0, resolve)); // port 0 = any free port
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  async function api(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  test('GET /api/health returns ok', async () => {
    const res = await api('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  test('full flow: add book -> register member -> borrow -> return late -> fine', async () => {
    const book = await api('POST', '/api/books', { title: 'Clean Code', author: 'Robert C. Martin', totalCopies: 1 });
    assert.equal(book.status, 201);

    const member = await api('POST', '/api/members', { name: 'Juan', email: 'juan@example.com' });
    assert.equal(member.status, 201);

    const loan = await api('POST', '/api/loans', { memberId: member.body.id, bookId: book.body.id });
    assert.equal(loan.status, 201);
    assert.equal(loan.body.dueDate, '2026-12-15');

    const afterBorrow = await api('GET', `/api/books/${book.body.id}`);
    assert.equal(afterBorrow.body.availableCopies, 0);

    const returned = await api('POST', `/api/loans/${loan.body.id}/return`, { returnDate: '2026-12-18' });
    assert.equal(returned.status, 200);
    assert.equal(returned.body.fine, 30);

    const afterReturn = await api('GET', `/api/books/${book.body.id}`);
    assert.equal(afterReturn.body.availableCopies, 1);

    const history = await api('GET', `/api/members/${member.body.id}/loans`);
    assert.equal(history.body.length, 1);
  });

  test('borrowing an unavailable book returns 409', async () => {
    const book = await api('POST', '/api/books', { title: 'Rare', author: 'X', totalCopies: 1 });
    const a = await api('POST', '/api/members', { name: 'A', email: 'a@example.com' });
    const b = await api('POST', '/api/members', { name: 'B', email: 'b@example.com' });
    await api('POST', '/api/loans', { memberId: a.body.id, bookId: book.body.id });
    const res = await api('POST', '/api/loans', { memberId: b.body.id, bookId: book.body.id });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /no available copies/);
  });

  test('invalid input returns 400 with an error message', async () => {
    const res = await api('POST', '/api/books', { author: 'No title' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Title is required');
  });

  test('unknown book returns 404', async () => {
    const res = await api('GET', '/api/books/9999');
    assert.equal(res.status, 404);
  });

  test('malformed JSON returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/books`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json',
    });
    assert.equal(res.status, 400);
  });

  test('update and delete a book', async () => {
    const book = await api('POST', '/api/books', { title: 'Draft', author: 'Me' });
    const updated = await api('PUT', `/api/books/${book.body.id}`, { title: 'Final' });
    assert.equal(updated.body.title, 'Final');

    const del = await api('DELETE', `/api/books/${book.body.id}`);
    assert.equal(del.status, 204);
    assert.equal((await api('GET', `/api/books/${book.body.id}`)).status, 404);
  });

  test('search books with ?search=', async () => {
    await api('POST', '/api/books', { title: 'Noli Me Tangere', author: 'Jose Rizal' });
    const res = await api('GET', '/api/books?search=rizal');
    assert.equal(res.status, 200);
    assert.ok(res.body.every((b) => b.author.includes('Rizal')));
  });

  test('wrong HTTP method returns 405', async () => {
    const res = await api('PATCH', '/api/books');
    assert.equal(res.status, 405);
  });

  test('serves the web page at /', async () => {
    const res = await fetch(baseUrl + '/');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Library Management System/);
  });
});
