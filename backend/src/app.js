const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const prisma = require('./db');
const logger = require('./logger');
const { sign, requireAdmin } = require('./auth');
const { jobSchema, applySchema, statusSchema, loginSchema, formatErrors, JOB_TYPES, STATUSES } = require('./validation');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(logger.middleware);

const PAGE_SIZE = 10;

const validate = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body ?? {});
  if (!r.success) return res.status(400).json({ error: 'Validation failed', errors: formatErrors(r.error) });
  req.data = r.data;
  next();
};

function parseId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid job id' });
  req.jobId = id;
  next();
}

// Express 5 forwards rejected promises to the error handler, so async handlers need no try/catch.

// ---- Health
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'up' });
  } catch (e) {
    logger.error('health check failed', { error: e.message });
    res.status(503).json({ status: 'error', database: 'down' });
  }
});

// ---- Meta
app.get('/api/meta', (req, res) => res.json({ types: JOB_TYPES, statuses: STATUSES }));

// ---- Admin login
app.post('/api/admin/login', validate(loginSchema), async (req, res) => {
  const admin = await prisma.adminUser.findUnique({ where: { username: req.data.username } });
  if (!admin || !(await bcrypt.compare(req.data.password, admin.password_hash))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json({ token: sign(admin), username: admin.username });
});

// ---- Jobs
app.get('/api/jobs', async (req, res) => {
  const { q, location, type } = req.query;
  const status = typeof req.query.status === 'string' ? req.query.status : 'open';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  if (status !== 'all' && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status filter' });
  if (type && !JOB_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid job type filter' });

  const where = {};
  if (status !== 'all') where.status = status;
  if (type) where.type = type;
  if (typeof location === 'string' && location.trim()) where.location = { contains: location.trim() };
  if (typeof q === 'string' && q.trim()) {
    const s = q.trim();
    where.OR = [{ title: { contains: s } }, { company: { contains: s } }, { description: { contains: s } }];
  }

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { applications: true } } },
    }),
  ]);
  res.json({ jobs, page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
});

app.post('/api/jobs', requireAdmin, validate(jobSchema), async (req, res) => {
  const job = await prisma.job.create({ data: req.data });
  res.status(201).json(job);
});

app.get('/api/jobs/:id', parseId, async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.jobId } });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.post('/api/jobs/:id/apply', parseId, validate(applySchema), async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.jobId } });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'open') {
    return res.status(409).json({ error: `This job is ${job.status} and no longer accepts applications` });
  }
  const { candidate_name, email, resume_url, note } = req.data;
  const application = await prisma.application.create({
    data: { job_id: job.id, candidate_name, email, resume_url, note: note || null },
  });
  logger.info('application received', { job_id: job.id, application_id: application.id });
  res.status(201).json(application);
});

app.get('/api/jobs/:id/applications', requireAdmin, parseId, async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.jobId } });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const applications = await prisma.application.findMany({
    where: { job_id: job.id },
    orderBy: { created_at: 'desc' },
  });
  res.json({ job, applications });
});

app.patch('/api/jobs/:id/status', requireAdmin, parseId, validate(statusSchema), async (req, res) => {
  const exists = await prisma.job.findUnique({ where: { id: req.jobId } });
  if (!exists) return res.status(404).json({ error: 'Job not found' });
  const job = await prisma.job.update({ where: { id: req.jobId }, data: { status: req.data.status } });
  res.json(job);
});

// ---- Serve built frontend (if present) so one process serves UI + API
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// ---- Errors
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  logger.error('unhandled error', { error: err.message, path: req.originalUrl });
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
