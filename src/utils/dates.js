// Date helpers. All dates are stored as 'YYYY-MM-DD' strings and compared in
// UTC so results never shift because of the computer's time zone.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(str) {
  if (typeof str !== 'string' || !DATE_RE.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

function toDate(str) {
  return new Date(`${str}T00:00:00Z`);
}

function addDays(str, days) {
  const d = toDate(str);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Whole days from `from` to `to` (negative if `to` is earlier).
function daysBetween(from, to) {
  return Math.round((toDate(to) - toDate(from)) / 86400000);
}

function today() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

module.exports = { isValidDate, addDays, daysBetween, today };
