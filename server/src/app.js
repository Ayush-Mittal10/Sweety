const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth');
const readingRoutes = require('./routes/readings');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Express 5 forwards errors from async handlers here automatically
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
