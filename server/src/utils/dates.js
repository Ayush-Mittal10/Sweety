// All dates in the app are plain 'YYYY-MM-DD' strings (no time, no timezone).
// "Today" is based on the server's local timezone, which can be set with
// the TZ environment variable (see README notes).

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return toISODate(new Date());
}

// Checks the format and that the date really exists (e.g. rejects 2026-02-30)
function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

module.exports = { toISODate, todayISO, isValidISODate };
