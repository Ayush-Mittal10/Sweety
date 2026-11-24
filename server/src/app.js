const express = require('express');
const cors = require('cors');
const config = require('./config');

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
