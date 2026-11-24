const { Pool, types } = require('pg');

// By default pg turns DATE columns into JS Date objects at local midnight,
// which can shift the day depending on the server timezone. We only care
// about the calendar date, so keep it as a 'YYYY-MM-DD' string.
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value) => value);

const connectionString =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

const pool = new Pool({ connectionString });

module.exports = pool;
