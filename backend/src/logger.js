// Structured (JSON) logs on stdout
function log(level, msg, extra = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));
}

const logger = {
  info: (m, e) => log('info', m, e),
  warn: (m, e) => log('warn', m, e),
  error: (m, e) => log('error', m, e),
  middleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () =>
      log('info', 'request', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
      })
    );
    next();
  },
};

module.exports = logger;
