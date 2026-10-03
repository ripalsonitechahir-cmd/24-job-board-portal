require('dotenv').config();
const prisma = require('../src/db');
const { ensureAdmin } = require('../src/seed');

const jobs = [
  ['Senior React Developer', 'Acme Corp', 'New York', 'Full-time', 110000, 140000, 'Build and maintain our customer-facing React applications.'],
  ['Node.js Backend Engineer', 'Globex', 'Remote', 'Remote', 95000, 125000, 'Design REST APIs with Node.js, Express and SQL databases.'],
  ['UX Designer', 'Initech', 'San Francisco', 'Contract', 70000, 90000, 'Create wireframes, prototypes and design systems.'],
  ['Data Analyst Intern', 'Umbrella Ltd', 'London', 'Internship', 20000, 30000, 'Support the analytics team with reporting and dashboards.'],
  ['DevOps Engineer', 'Hooli', 'Austin', 'Full-time', 120000, 150000, 'Own CI/CD, containers and Kubernetes infrastructure.'],
  ['QA Automation Engineer', 'Stark Industries', 'Boston', 'Full-time', 85000, 105000, 'Write automated UI and API tests.'],
  ['Customer Support Specialist', 'Wayne Enterprises', 'Chicago', 'Part-time', 35000, 45000, 'Help customers via email and chat.'],
  ['Product Manager', 'Wonka Industries', 'Remote', 'Remote', 115000, 145000, 'Define the roadmap and work with engineering and design.'],
  ['Mobile Developer', 'Soylent Corp', 'Seattle', 'Full-time', 100000, 130000, 'Build cross-platform mobile apps.'],
  ['Technical Writer', 'Cyberdyne', 'Denver', 'Contract', 60000, 80000, 'Write developer documentation and guides.'],
  ['Marketing Coordinator', 'Pied Piper', 'Miami', 'Part-time', 30000, 42000, 'Plan campaigns and manage social channels.'],
  ['Full Stack Developer', 'Vandelay Industries', 'Toronto', 'Full-time', 90000, 120000, 'Work across the React front end and Node.js back end.'],
];

(async () => {
  await ensureAdmin();
  if ((await prisma.job.count()) === 0) {
    for (const [title, company, location, type, salary_min, salary_max, description] of jobs) {
      await prisma.job.create({ data: { title, company, location, type, salary_min, salary_max, description } });
    }
  }
  console.log('Seed complete');
  await prisma.$disconnect();
})();
