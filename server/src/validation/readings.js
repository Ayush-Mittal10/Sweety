const { SLOTS } = require('../utils/slots');
const { todayISO, isValidISODate } = require('../utils/dates');

const MIN_VALUE = 40;
const MAX_VALUE = 600;

// Returns an error message, or null if the reading is valid.
// These only check the input itself; rules that need the database
// (duplicate slot, 4 per day) are checked in the route.
function validateReading({ date, slot, value }) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 'Please enter a glucose value.';
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < MIN_VALUE || number > MAX_VALUE) {
    return `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`;
  }

  if (!SLOTS.includes(slot)) {
    return 'Please choose a time slot.';
  }

  if (!isValidISODate(date)) {
    return 'Please choose a valid date.';
  }

  // ISO date strings compare correctly as plain strings
  if (date > todayISO()) {
    return 'Date cannot be in the future.';
  }

  return null;
}

module.exports = { validateReading, MIN_VALUE, MAX_VALUE };
