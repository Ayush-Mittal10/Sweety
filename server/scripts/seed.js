// Creates a demo user with readings from the 1st of last month up to today,
// so all three reports have something to show.
// Running it again resets the demo user's data.
const bcrypt = require('bcrypt');
const pool = require('../src/db');
const { toISODate } = require('../src/utils/dates');

const DEMO_USER = {
  name: 'Demo Patient',
  email: 'demo@sweety.app',
  password: 'demo1234',
};

// Typical ranges (mg/dl) for someone with fairly well managed diabetes
const SLOT_RANGES = {
  morning_fasting: [85, 135],
  after_breakfast: [120, 190],
  after_lunch: [125, 200],
  after_dinner: [120, 210],
};

// Small seeded random generator so every run produces the same demo data
function createRandom(seed) {
  return function random() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function buildReadings(random) {
  const readings = [];
  const today = new Date();
  const day = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  while (day <= today) {
    const date = toISODate(day);

    // leave the odd day completely empty, like a real patient would
    if (random() > 0.07) {
      for (const [slot, [min, max]] of Object.entries(SLOT_RANGES)) {
        // and skip some individual readings
        if (random() < 0.15) continue;

        let value = Math.round(min + random() * (max - min));
        // an occasional spike or low so the highest/lowest stand out
        const roll = random();
        if (roll < 0.03) value = 240 + Math.round(random() * 40);
        else if (roll < 0.05) value = 62 + Math.round(random() * 10);

        readings.push({ date, slot, value });
      }
    }

    day.setDate(day.getDate() + 1);
  }

  return readings;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // readings are removed too (ON DELETE CASCADE)
    await client.query('DELETE FROM users WHERE email = $1', [DEMO_USER.email]);

    const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
    const { rows } = await client.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [DEMO_USER.name, DEMO_USER.email, passwordHash]
    );
    const userId = rows[0].id;

    const readings = buildReadings(createRandom(42));
    for (const { date, slot, value } of readings) {
      await client.query(
        'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)',
        [userId, date, slot, value]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${readings.length} readings for the demo user.`);
    console.log(`Log in with: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
