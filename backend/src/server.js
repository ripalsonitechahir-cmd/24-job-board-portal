require('dotenv').config();
const app = require('./app');
const logger = require('./logger');
const { ensureAdmin } = require('./seed');

const port = process.env.PORT || 4000;

ensureAdmin()
  .then(() => app.listen(port, () => logger.info('server listening', { port })))
  .catch((e) => {
    logger.error('startup failed', { error: e.message });
    process.exit(1);
  });
