// Simple data store (Repository pattern).
// - With a filePath: data is loaded from / saved to a JSON file (used by the real app).
// - Without a filePath: data lives only in memory (used by the tests, so they
//   never touch the real data file).
const fs = require('fs');
const path = require('path');

const EMPTY = () => ({ books: [], members: [], loans: [], counters: { books: 0, members: 0, loans: 0 } });

class Store {
  constructor(filePath = null, initialData = null) {
    this.filePath = filePath;
    this.data = EMPTY();

    if (filePath && fs.existsSync(filePath)) {
      this.data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
    } else if (initialData) {
      this.data = { ...EMPTY(), ...JSON.parse(JSON.stringify(initialData)) };
      this.save();
    }
  }

  nextId(collection) {
    this.data.counters[collection] = (this.data.counters[collection] || 0) + 1;
    return this.data.counters[collection];
  }

  all(collection) {
    return this.data[collection];
  }

  findById(collection, id) {
    return this.data[collection].find((item) => item.id === Number(id)) || null;
  }

  insert(collection, item) {
    const record = { id: this.nextId(collection), ...item };
    this.data[collection].push(record);
    this.save();
    return record;
  }

  update(collection, id, changes) {
    const record = this.findById(collection, id);
    if (!record) return null;
    Object.assign(record, changes, { id: record.id });
    this.save();
    return record;
  }

  remove(collection, id) {
    const list = this.data[collection];
    const index = list.findIndex((item) => item.id === Number(id));
    if (index === -1) return false;
    list.splice(index, 1);
    this.save();
    return true;
  }

  save() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}

module.exports = { Store };
