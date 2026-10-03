const { z } = require('zod');

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
const STATUSES = ['open', 'filled', 'closed'];

const text = (label, max) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const salary = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z
    .number({ error: 'Salary must be a number' })
    .int('Salary must be a whole number')
    .min(0, 'Salary cannot be negative')
    .optional()
);

const jobSchema = z
  .object({
    title: text('Title', 150),
    company: text('Company', 150),
    location: text('Location', 150),
    type: z.enum(JOB_TYPES, { error: `Type must be one of: ${JOB_TYPES.join(', ')}` }),
    salary_min: salary,
    salary_max: salary,
    description: text('Description', 5000),
  })
  .refine((j) => j.salary_min == null || j.salary_max == null || j.salary_min <= j.salary_max, {
    message: 'Minimum salary cannot exceed maximum salary',
    path: ['salary_max'],
  });

const applySchema = z.object({
  candidate_name: text('Name', 120),
  email: z.string({ error: 'Email is required' }).trim().max(200).email('Email is invalid'),
  resume_url: z
    .string({ error: 'Resume link is required' })
    .trim()
    .max(500)
    .url('Resume link must be a valid URL')
    .refine((u) => /^https?:\/\//i.test(u), 'Resume link must start with http:// or https://'),
  note: z.string().trim().max(2000, 'Note is too long').optional(),
});

const statusSchema = z.object({
  status: z.enum(STATUSES, { error: `Status must be one of: ${STATUSES.join(', ')}` }),
});

const loginSchema = z.object({
  username: text('Username', 100),
  password: text('Password', 200),
});

function formatErrors(err) {
  const errors = {};
  for (const i of err.issues) {
    const key = i.path.join('.') || '_';
    if (!errors[key]) errors[key] = i.message;
  }
  return errors;
}

module.exports = { jobSchema, applySchema, statusSchema, loginSchema, formatErrors, JOB_TYPES, STATUSES };
