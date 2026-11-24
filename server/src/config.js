require('dotenv').config({ quiet: true });

module.exports = {
  port: process.env.PORT || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
