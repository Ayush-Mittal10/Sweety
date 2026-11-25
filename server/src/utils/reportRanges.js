// Works out the date ranges for the three reports from one selected date.
// Example for 2026-10-15:
//   daily:         2026-10-15 .. 2026-10-15
//   monthToDate:   2026-10-01 .. 2026-10-15
//   previousMonth: 2026-09-01 .. 2026-09-30

function pad(number) {
  return String(number).padStart(2, '0');
}

function formatDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

// month is 1-12. Day 0 of the next month is the last day of this one.
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// selectedDate must be a valid 'YYYY-MM-DD' string (validated by the caller)
function getReportRanges(selectedDate) {
  const [year, month] = selectedDate.split('-').map(Number);

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;

  return {
    daily: { from: selectedDate, to: selectedDate },
    monthToDate: { from: formatDate(year, month, 1), to: selectedDate },
    previousMonth: {
      from: formatDate(prevYear, prevMonth, 1),
      to: formatDate(prevYear, prevMonth, daysInMonth(prevYear, prevMonth)),
    },
  };
}

module.exports = { getReportRanges };
