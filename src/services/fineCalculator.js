// Late-fine rules (pure functions = easy to unit test).
const { daysBetween, isValidDate } = require('../utils/dates');
const { ValidationError } = require('../errors');

const FINE_PER_DAY = 10;   // PHP 10 per day late
const MAX_FINE = 500;      // fine is capped at PHP 500 per loan

function daysLate(dueDate, returnDate) {
  if (!isValidDate(dueDate) || !isValidDate(returnDate)) {
    throw new ValidationError('Dates must be in YYYY-MM-DD format');
  }
  return Math.max(0, daysBetween(dueDate, returnDate));
}

function calculateFine(dueDate, returnDate) {
  return Math.min(daysLate(dueDate, returnDate) * FINE_PER_DAY, MAX_FINE);
}

module.exports = { calculateFine, daysLate, FINE_PER_DAY, MAX_FINE };
