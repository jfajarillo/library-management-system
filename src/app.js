// Builds the whole application: store -> services -> routes -> HTTP server.
// Kept separate from server.js so tests can create a fresh app with in-memory data.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Store } = require('./storage/store');
const { BookService } = require('./services/bookService');
const { MemberService } = require('./services/memberService');
const { LoanService } = require('./services/loanService');
const { Router, HttpResult } = require('./router');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };

function createApp({ store = new Store(), clock } = {}) {
  const books = new BookService(store);
  const members = new MemberService(store);
  const loans = new LoanService(store, books, members, clock);

  const router = new Router();
  const created = (data) => new HttpResult(201, data);
  const noContent = () => new HttpResult(204);

  router.get('/api/health', () => ({ status: 'ok' }));

  // Books
  router.get('/api/books', ({ query }) => books.list(query));
  router.get('/api/books/:id', ({ params }) => books.get(params.id));
  router.post('/api/books', ({ body }) => created(books.create(body)));
  router.put('/api/books/:id', ({ params, body }) => books.update(params.id, body));
  router.delete('/api/books/:id', ({ params }) => { books.remove(params.id); return noContent(); });

  // Members
  router.get('/api/members', () => members.list());
  router.get('/api/members/:id', ({ params }) => members.get(params.id));
  router.get('/api/members/:id/loans', ({ params }) => { members.get(params.id); return loans.list({ memberId: params.id }); });
  router.post('/api/members', ({ body }) => created(members.create(body)));
  router.put('/api/members/:id', ({ params, body }) => members.update(params.id, body));
  router.delete('/api/members/:id', ({ params }) => { members.remove(params.id); return noContent(); });

  // Loans
  router.get('/api/loans', ({ query }) => loans.list(query));
  router.get('/api/loans/:id', ({ params }) => loans.get(params.id));
  router.post('/api/loans', ({ body }) => created(loans.borrow(body)));
  router.post('/api/loans/:id/return', ({ params, body }) => loans.returnBook(params.id, body));

  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) return router.handle(req, res);
    serveStatic(req, res);
  });

  return { server, store, services: { books, members, loans } };
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  });
}

module.exports = { createApp };
