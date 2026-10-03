# Mini Job Board Portal

Companies post jobs; candidates browse, search and apply; an admin reviews applications and marks jobs filled/closed.

**Stack:** React (Vite) · Node.js/Express · SQLite · Prisma. Packaged with Docker and deployable to Kubernetes (single pod).

## Quick start

Requires Node.js 20+.

```bash
npm run setup     # installs deps, creates SQLite DB + seed data, builds the UI
npm start         # http://localhost:4000  (UI + API from one server)
```

Admin login: `admin` / `admin123` (set in `backend/.env`, copied from `backend/.env.example`; `setup` expects `backend/.env` to exist, so copy it first on a fresh clone).

### Development mode (hot reload)

```bash
npm run dev:backend    # API on :4000
npm run dev:frontend   # UI on :5173, proxies /api and /health to :4000
```

### Tests

```bash
npm test    # 10 API tests against an isolated SQLite file
```

## Docker

```bash
docker compose up --build -d    # http://localhost:4000
docker compose down             # stop (data kept in the db_data volume)
docker compose down -v          # stop and delete data
```

## Kubernetes (one pod)

SQLite is a file on a ReadWriteOnce volume, so the app runs as exactly **one** replica (Deployment with `Recreate` strategy + 1Gi PVC). Manifests are in `k8s/` (namespace, ConfigMap, Secret, PVC, Deployment, NodePort Service).

```bash
docker build -t job-board-portal:1.0 .           # image must be available to the cluster (Docker Desktop shares it)
kubectl apply -f k8s/namespace.yaml && kubectl apply -f k8s/
kubectl get all -n job-board-portal
# open http://localhost:30080
kubectl delete ns job-board-portal               # teardown
```

For minikube use `minikube image load job-board-portal:1.0`; for kind use `kind load docker-image job-board-portal:1.0`. The Secret holds demo credentials: change them before real use.

## Configuration (`backend/.env`)

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Server port | 4000 |
| `DATABASE_URL` | Prisma SQLite URL | `file:./dev.db` |
| `JWT_SECRET` | Signs admin tokens. **Change it.** | `change-me` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin created at startup if missing | admin / admin123 |

## Features → requirements

| Requirement | Where |
|---|---|
| Post a job | Admin Dashboard → "Post a job" (`POST /api/jobs`) |
| Browse with pagination | Job List, 10 per page |
| Search/filter by keyword, location, type | Job List filters (`GET /api/jobs?q=&location=&type=&page=`) |
| Job detail + Apply form | `/jobs/:id` (`POST /api/jobs/:id/apply`) |
| Admin: applications per job | `/admin/jobs/:id` (`GET /api/jobs/:id/applications`) |
| Mark job filled/closed | Dashboard status dropdown (`PATCH /api/jobs/:id/status`) |
| Health | `GET /health` → 200 only if the DB responds, else 503 |

Notes: the public list shows only `open` jobs by default (`status=all|open|filled|closed` is accepted). Applying to a filled/closed job returns 409. Admin endpoints use a JWT bearer token from `POST /api/admin/login`. Validation runs on both client and server, errors return 400 with per-field messages, and logs are JSON on stdout.

## Layout

```
backend/   Express API, Prisma schema (prisma/schema.prisma), tests
frontend/  React app (Vite)
```
