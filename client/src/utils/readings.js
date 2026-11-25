import { todayISO } from './dates';

// Same keys and labels as the server (server/src/utils/slots.js)
export const SLOTS = [
  { value: 'morning_fasting', label: 'Morning (fasting)' },
  { value: 'after_breakfast', label: 'After breakfast' },
  { value: 'after_lunch', label: 'After lunch' },
  { value: 'after_dinner', label: 'After dinner' },
];

export function slotLabel(value) {
  return SLOTS.find((slot) => slot.value === value)?.label ?? value;
}

// Quick checks before calling the API so the user gets instant feedback.
// The server runs the same checks (plus the duplicate / 4-per-day rules),
// so this is only for convenience, not security.
export function validateReadingForm({ date, value }) {
  if (String(value).trim() === '') return 'Please enter a glucose value.';

  const number = Number(value);
  if (!Number.isInteger(number) || number < 40 || number > 600) {
    return 'Value must be between 40 and 600 mg/dl.';
  }

  if (!date) return 'Please choose a date.';
  if (date > todayISO()) return 'Date cannot be in the future.';

  return null;
}
