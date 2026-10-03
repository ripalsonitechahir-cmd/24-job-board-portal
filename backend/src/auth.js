const jwt = require('jsonwebtoken');

const secret = () => process.env.JWT_SECRET || 'dev-secret';

const sign = (admin) => jwt.sign({ sub: admin.id, username: admin.username }, secret(), { expiresIn: '8h' });

function requireAdmin(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.admin = jwt.verify(token, secret());
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { sign, requireAdmin };
