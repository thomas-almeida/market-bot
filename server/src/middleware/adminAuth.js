const AdminToken = require('../models/AdminToken');

async function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];

  if (!token) {
    return res.status(401).json({ error: true, message: 'Token not provided' });
  }

  try {
    const record = await AdminToken.findOne({
      token,
      expiresAt: { $gte: new Date() },
    });

    if (!record) {
      return res.status(403).json({ error: true, message: 'Invalid or expired token' });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: true, message: 'Auth error' });
  }
}

module.exports = adminAuth;
