// `npm run reset-data` deletes the saved data so the next start uses the sample data again.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'library.json');
if (fs.existsSync(file)) {
  fs.unlinkSync(file);
  console.log('Data reset. Sample data will load on next start.');
} else {
  console.log('No data file yet - nothing to reset.');
}
