// Finds every *.test.js file under the given folder and runs it with Node's
// built-in test runner. Works the same on Windows, macOS and Linux, and on
// Node 18, 20 and 22 (whose `node --test <folder>` behaviour differs).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function findTests(dir) {
  let found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found = found.concat(findTests(full));
    else if (entry.name.endsWith('.test.js')) found.push(full);
  }
  return found.sort();
}

const target = path.resolve(process.argv[2] || 'tests');
const files = findTests(target);

if (files.length === 0) {
  console.log(`No test files found in ${target}`);
  process.exit(0);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
