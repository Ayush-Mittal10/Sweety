// Key stored in the database -> label shown to the user
const SLOT_LABELS = {
  morning_fasting: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};

const SLOTS = Object.keys(SLOT_LABELS);

module.exports = { SLOT_LABELS, SLOTS };
