# 📚 Library Management System

A web-based Library Management System for managing **books**, **members**, and **book loans** (borrowing, returning, and late fines). It has a REST API and a browser UI, and is built with **plain Node.js and zero external dependencies**, so there's nothing to `npm install`.

---

## Features

- **Books**: add, edit, delete, search by title/author, track available copies
- **Members**: register, edit, delete, unique email check
- **Loans**: borrow and return books, loan history per member, overdue tracking
- **Automatic late fines**: ₱10 per day late, capped at ₱500
- **Business rules enforced**:
  - A book can't be borrowed when no copies are available
  - A member can hold at most **3** books at a time
  - A member can't borrow the same book twice at once
  - Books and members with active loans can't be deleted
  - Loan period is **14 days**

---

## Requirements

- **Node.js 18 or newer** ([download](https://nodejs.org/)). Check with `node --version`.
- That's it. No database or `npm install` needed.

---

## Quick Start

```bash
git clone https://github.com/<your-username>/library-management-system.git
cd library-management-system
npm start
```

Open **http://localhost:3000** in your browser.

Sample books and members load automatically the first time. Data is saved in `data/library.json`.

| Command | What it does |
|---|---|
| `npm start` | Starts the server at http://localhost:3000 |
| `npm test` | Runs **all** tests (unit + integration) |
| `npm run test:unit` | Runs only unit tests |
| `npm run test:integration` | Runs only integration tests |
| `npm run reset-data` | Deletes saved data (sample data loads again on next start) |

To use a different port: `PORT=4000 npm start` (Windows PowerShell: `$env:PORT=4000; npm start`)

---

## Project Structure

```
library-management-system/
├── src/
│   ├── server.js              # Entry point (npm start)
│   ├── app.js                 # Wires store → services → routes → HTTP server
│   ├── router.js              # Minimal HTTP router (path params, JSON, errors)
│   ├── errors.js              # ValidationError (400), NotFoundError (404), ConflictError (409)
│   ├── seed.js                # Sample data for first run
│   ├── storage/store.js       # Data store (JSON file or in-memory)
│   ├── services/
│   │   ├── bookService.js     # Book rules
│   │   ├── memberService.js   # Member rules
│   │   ├── loanService.js     # Borrow / return rules
│   │   └── fineCalculator.js  # Late-fine calculation
│   └── utils/dates.js         # Date helpers
├── public/                    # Web UI (HTML, CSS, JS)
├── tests/
│   ├── unit/                  # Tests for each service in isolation
│   └── integration/           # Tests the real HTTP API end-to-end
├── postman/                   # Postman collection for API testing
├── docs/                      # User Manual, Technical Documentation, test evidence
└── scripts/                   # Test runner and data reset helpers
```

---

## System Design (Module 6)

The app uses a **layered architecture**:

```
Browser UI / Postman
        │  HTTP (JSON)
        ▼
   Router (router.js / app.js)     ← handles HTTP only
        │
        ▼
   Services (bookService, memberService, loanService, fineCalculator)   ← business rules
        │
        ▼
   Store (storage/store.js)        ← reads/writes data
        │
        ▼
   data/library.json
```

Design techniques used:

| Technique | Where |
|---|---|
| **Separation of concerns / layered architecture** | Router, services, and storage are separate layers |
| **Repository pattern** | `Store` hides how data is saved; services never touch files directly |
| **Dependency injection** | Services receive their `store` (and `LoanService` a `clock`) through the constructor, so tests can pass in-memory data and a fake date |
| **Single Responsibility Principle** | Each service handles one entity; fine logic is its own pure module |
| **Custom error hierarchy** | Services throw typed errors, and the router maps them to HTTP status codes |
| **Pure functions** | `fineCalculator` has no side effects, so it's trivial to test |

---

## API Reference

Base URL: `http://localhost:3000`

### Books
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/books` | List books (`?search=text` to filter) |
| GET | `/api/books/:id` | Get one book |
| POST | `/api/books` | Create a book |
| PUT | `/api/books/:id` | Update a book |
| DELETE | `/api/books/:id` | Delete a book |

```json
POST /api/books
{ "title": "Clean Code", "author": "Robert C. Martin", "isbn": "9780132350884", "totalCopies": 2 }
```

### Members
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/members` | List members |
| GET | `/api/members/:id` | Get one member |
| GET | `/api/members/:id/loans` | A member's loan history |
| POST | `/api/members` | Register a member |
| PUT | `/api/members/:id` | Update a member |
| DELETE | `/api/members/:id` | Delete a member |

```json
POST /api/members
{ "name": "Juan Dela Cruz", "email": "juan@example.com" }
```

### Loans
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/loans` | List loans (`?status=active`, `overdue`, or `returned`) |
| GET | `/api/loans/:id` | Get one loan |
| POST | `/api/loans` | Borrow a book |
| POST | `/api/loans/:id/return` | Return a book (fine is calculated automatically) |

```json
POST /api/loans
{ "memberId": 1, "bookId": 3 }

POST /api/loans/1/return
{ "returnDate": "2026-12-20" }      ← optional; defaults to today
```

### Status codes
| Code | Meaning |
|---|---|
| 200 / 201 / 204 | OK / Created / Deleted |
| 400 | Invalid input (e.g. missing title, bad email) |
| 404 | Item not found |
| 409 | Business rule blocked it (e.g. no copies left, max loans reached) |

Errors are returned as `{ "error": "message" }`.

---

## Testing (Module 4)

Tests use Node's **built-in test runner** (`node:test` + `node:assert`), so no Jest or Mocha install is needed.

```bash
npm test
```

| Type | File | What it covers |
|---|---|---|
| Unit | `tests/unit/fineCalculator.test.js` | Fine amounts, on-time returns, cap, date validation |
| Unit | `tests/unit/bookService.test.js` | Book validation, ISBN rules, search, update, delete rules |
| Unit | `tests/unit/memberService.test.js` | Member validation, unique email, delete rules |
| Unit | `tests/unit/loanService.test.js` | Borrow/return rules, max loans, availability, overdue, fines |
| Unit | `tests/unit/store.test.js` | IDs, saving and reloading the JSON file |
| Integration | `tests/integration/api.test.js` | Starts the real server and tests the API end-to-end |

Unit tests use an **in-memory store** and a **fake clock**, so they're fast and repeatable and never touch real data.

### API testing with Postman
1. Start the server: `npm start`
2. In Postman: **Import** → `postman/Library-API.postman_collection.json`
3. Click the collection → **Run** → **Run Library Management System API**
4. Every request has test scripts. Screenshot the results for your evidence (save them in `docs/`).

---

## Test-Driven Development (TDD)

Each feature was built with **Red → Green → Refactor**:

1. **Red**: write a test for the new rule and run `npm test` to see it fail
2. **Green**: write the minimum code needed to make the test pass
3. **Refactor**: clean up the code while keeping the tests green

The commit history shows this order: a `test:` commit followed by a `feat:` commit for each feature.

---

## Git Workflow

- `main` always holds working code
- Each member works on a `feature/<name>` branch and opens a **Pull Request**
- Another member reviews and merges the PR

Commit message prefixes: `feat:` new feature · `test:` tests · `fix:` bug fix · `docs:` documentation · `refactor:` code cleanup

---

## Team

| Member | Role | Responsibilities |
|---|---|---|
| Jarel Fajarillo | Project Lead | Repo setup, architecture, Book module, merging PRs |
| Cedi Evangelista | Developer | Member module + tests |
| Gian Carlo Quizon | Developer | Loan module (borrow/return) + tests |
| Harjot Singh | Developer / QA | Fine calculator, API routes, Postman testing |
| Gio Medina | QA / Documentation | Integration tests, User Manual, Technical Documentation |

---

## Documentation

- 📘 [User Manual](docs/USER_MANUAL.md)
- 🛠️ [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md)
- ✅ Test results & Postman screenshots: `docs/`
