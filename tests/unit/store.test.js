const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store } = require('../../src/storage/store');

describe('Store', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'library-test-'));
  after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  test('assigns increasing ids', () => {
    const store = new Store();
    assert.equal(store.insert('books', { title: 'A' }).id, 1);
    assert.equal(store.insert('books', { title: 'B' }).id, 2);
  });

  test('ids are not reused after delete', () => {
    const store = new Store();
    store.insert('books', { title: 'A' });
    store.remove('books', 1);
    assert.equal(store.insert('books', { title: 'B' }).id, 2);
  });

  test('saves to and reloads from a JSON file', () => {
    const file = path.join(tmpDir, 'data.json');
    const first = new Store(file, { books: [] });
    first.insert('books', { title: 'Persisted' });

    const second = new Store(file);
    assert.equal(second.all('books')[0].title, 'Persisted');
  });
});
