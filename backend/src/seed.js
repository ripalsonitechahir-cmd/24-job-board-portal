const bcrypt = require('bcryptjs');
const prisma = require('./db');

// Creates the admin user from env vars if it does not exist yet.
async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (!existing) {
    await prisma.adminUser.create({ data: { username, password_hash: await bcrypt.hash(password, 10) } });
  }
}

module.exports = { ensureAdmin };
