const jwt = require('jsonwebtoken');
const config = require('../config');

// Expects "Authorization: Bearer <token>" and sets req.userId
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = payload.userId;
    next();
  } catch (err) {
    // expired or tampered token
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

module.exports = requireAuth;
