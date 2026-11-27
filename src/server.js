// Entry point: `npm start` (or `node src/server.js`).
const path = require('path');
const { createApp } = require('./app');
const { Store } = require('./storage/store');
const seed = require('./seed');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'library.json');

const store = new Store(DATA_FILE, seed);
const { server } = createApp({ store });

server.listen(PORT, () => {
  console.log(`Library Management System running at http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
