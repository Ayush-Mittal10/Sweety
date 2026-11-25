// Dates are handled as 'YYYY-MM-DD' strings in the user's local time,
// which is also the format <input type="date"> uses.

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

// Month names are spelled out here instead of using toLocaleDateString,
// which gives 'Sept' in some browsers and changes with the user's locale.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function splitDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month, day };
}

function shortMonth(month) {
  return MONTHS[month - 1].slice(0, 3);
}

// '2026-10-15' -> '15 Oct 2026'
export function formatDate(isoDate) {
  const { year, month, day } = splitDate(isoDate);
  return `${day} ${shortMonth(month)} ${year}`;
}

// ('2026-10-01', '2026-10-15') -> '1 Oct – 15 Oct 2026'
// ('2026-10-15', '2026-10-15') -> '15 Oct 2026'
export function formatDateRange(from, to) {
  if (from === to) return formatDate(from);

  const start = splitDate(from);
  const end = splitDate(to);

  if (start.year === end.year) {
    return `${start.day} ${shortMonth(start.month)} – ${formatDate(to)}`;
  }
  return `${formatDate(from)} – ${formatDate(to)}`;
}

// '2026-09-01' -> 'September'
export function monthName(isoDate) {
  return MONTHS[splitDate(isoDate).month - 1];
}
