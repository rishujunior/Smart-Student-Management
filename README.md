# Smart Student Management System

A full-stack, AI-powered Student Management System for universities and engineering colleges. Administrators, teachers, and students each get a role-specific dashboard for managing academics, attendance, results, assignments, fees, and communication — with a Google Gemini-powered AI assistant layered on top for tutoring, question generation, study plans, and performance analysis.

Built as a portfolio-grade reference implementation of a production FastAPI + MongoDB backend paired with a modern React 19 + TypeScript frontend.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Folder Structure](#folder-structure)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Demo Credentials](#demo-credentials)
8. [API Documentation](#api-documentation)
9. [Database Design](#database-design)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Security Notes](#security-notes)
13. [License](#license)

---

## Features

**Authentication**
Register, login, JWT access + refresh tokens, email verification, forgot-password flow, protected routes, role-based access control (Admin / Teacher / Student).

**Admin**
Create students & teachers, manage departments/courses/semesters, assign teachers to courses, view live analytics (enrollment trend, department distribution, grade distribution), manage attendance & results & fees, post notices, generate PDF/Excel reports.

**Teacher**
Manage assigned courses, take daily attendance, record internal/external marks, create assignments, grade student submissions, view class performance.

**Student**
View profile & edit it, view attendance (with 75% threshold highlighting) and results (with CGPA), submit assignments (with file upload and late-submission detection), view fee status, download an official PDF report card, use the AI study assistant.

**AI Suite (Google Gemini)**
Academic Q&A chat, practice-question generation, note summarization, personalized study plans, performance analysis with risk flags, weak-subject recommendations, and career learning roadmaps.

**Reports**
Server-rendered PDF report cards (ReportLab) and Excel attendance exports (openpyxl).

**UI**
Glassmorphism dashboard, dark/light mode (persisted), animated charts (Recharts), toast notifications, loading states, fully responsive layout.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router, TanStack Query, Axios, React Hook Form + Zod, Recharts, Sonner |
| Backend | FastAPI, Pydantic v2, Motor (async MongoDB driver), python-jose (JWT), Passlib + bcrypt |
| Database | MongoDB |
| AI | Google Gemini (`google-generativeai`) |
| Reports | ReportLab (PDF), openpyxl (Excel) |
| Testing | Pytest + pytest-asyncio (backend), Vitest + React Testing Library (frontend) |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

---

## Architecture

```
                         ┌─────────────────────────┐
                         │        Browser           │
                         └────────────┬─────────────┘
                                      │ HTTPS
                         ┌────────────▼─────────────┐
                         │   React SPA (Vercel)      │
                         │  Router → Pages → Query   │
                         │  Axios client w/ JWT       │
                         │  interceptor + refresh     │
                         └────────────┬─────────────┘
                                      │ REST (JSON) — /api/v1/*
                         ┌────────────▼─────────────┐
                         │   FastAPI (Render)         │
                         │  ┌──────────────────────┐ │
                         │  │  API routers (v1)     │ │  ← HTTP layer, auth deps
                         │  ├──────────────────────┤ │
                         │  │  Service layer         │ │  ← business logic
                         │  ├──────────────────────┤ │
                         │  │  Motor (async driver)  │ │  ← data access
                         │  └──────────────────────┘ │
                         └────────┬──────────┬───────┘
                                  │          │
                     ┌────────────▼──┐   ┌───▼─────────────┐
                     │   MongoDB       │   │  Google Gemini   │
                     │   (Atlas)       │   │  (AI features)   │
                     └─────────────────┘   └──────────────────┘
```

The backend follows a layered, enterprise-style architecture:

- **`app/api/v1/*`** — HTTP routing only. Validates input via Pydantic schemas, enforces auth/role dependencies, and delegates to services.
- **`app/services/*`** — Business logic (repository-pattern data access, grade calculation, CGPA aggregation, assignment lifecycle, AI prompt construction). No FastAPI/HTTP concerns leak in here.
- **`app/schemas/*`** — Pydantic request/response contracts, decoupled from MongoDB's document shape.
- **`app/core/*`** — Cross-cutting concerns: settings (`config.py`), the Motor client (`database.py`), JWT + bcrypt (`security.py`), and auth dependencies (`dependencies.py`).

---

## Folder Structure

```
Student_Management/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py            # aggregates all v1 routers
│   │   │   └── v1/                  # auth, students, teachers, academic,
│   │   │                            # attendance_results, assignments,
│   │   │                            # notifications_fees, ai_routes, admin, reports
│   │   ├── core/                    # config, database, security, dependencies
│   │   ├── schemas/                 # Pydantic models (request/response contracts)
│   │   ├── services/                # business logic / repository layer
│   │   └── main.py                  # FastAPI app, middleware, lifespan
│   ├── tests/                       # pytest suite (auth, academic, students, results)
│   ├── seed.py                      # seeds departments, teachers, students, courses
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/              # Sidebar, Header, DashboardLayout
│   │   │   └── ui/                  # Button, Card, Input, Modal, StatCard
│   │   ├── context/                 # AuthContext (JWT session state)
│   │   ├── lib/                     # axios instance + interceptors, utils
│   │   ├── pages/                   # auth/, dashboard/, students/, teachers/,
│   │   │                            # academic/, attendance/, results/,
│   │   │                            # assignments/, ai/, fees/, notifications/, reports/
│   │   ├── test/                    # vitest setup
│   │   └── types/                   # shared TypeScript interfaces
│   ├── vite.config.ts               # dev proxy to backend + vitest config
│   ├── tailwind.config.js
│   └── .env.example
│
├── render.yaml                      # Render blueprint for the backend
├── LICENSE
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.11+
- **MongoDB** running locally (`mongodb://localhost:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Clone & enter the project

```bash
git clone <your-fork-url> Student_Management
cd Student_Management
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env      # edit values as needed (see Environment Variables below)
```

Seed the database with demo departments, teachers, students, courses and an admin account:

```bash
python seed.py
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`, with interactive docs at `http://localhost:8000/api/docs`.

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env      # defaults to http://localhost:8000/api/v1
npm run dev
```

The app is now live at `http://localhost:5173`. Vite's dev server proxies `/api` and `/uploads` to the backend automatically (see `vite.config.ts`), so `VITE_API_URL` can be left as `/api/v1` for local development if you prefer.

### MongoDB Setup

- **Local**: install MongoDB Community Server and ensure `mongod` is running on port `27017`. No further setup needed — `seed.py` creates the database and collections on first run.
- **Atlas (recommended for deployment)**: create a free cluster, add a database user, allow network access from `0.0.0.0/0` (or Render's egress IPs), and set `MONGODB_URL` to the provided `mongodb+srv://...` connection string.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `student_management_db` |
| `SECRET_KEY` | JWT signing secret — **change in production** | — |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | `7` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173,http://localhost:3000` |
| `GEMINI_API_KEY` | Google Gemini API key ([get one here](https://ai.google.dev/)) — AI routes degrade gracefully with a friendly message if unset | — |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Email configuration for verification/reset emails | — |
| `MAX_FILE_SIZE_MB` | Max upload size | `10` |
| `UPLOAD_DIR` | Local upload directory | `uploads` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API, including `/api/v1` | `/api/v1` (proxied in dev) |

---

## Demo Credentials

After running `python seed.py`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sms.edu` | `Admin@123` |
| Teacher | `prof.sharma@sms.edu` | `Teacher@123` |
| Student | `alice@student.sms.edu` | `Student@123` |

The login page also has one-click "Quick Demo Accounts" buttons for these three.

> **Note:** Administrator accounts can only be created via the seed script or by an existing admin — the public `/auth/register` endpoint explicitly rejects `role: "admin"` to prevent privilege escalation.

---

## API Documentation

Interactive, auto-generated docs (Swagger UI and ReDoc) are served directly by FastAPI:

- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`
- OpenAPI schema: `http://localhost:8000/api/openapi.json`

### Endpoint groups (all under `/api/v1`)

| Prefix | Purpose |
|---|---|
| `/auth` | register, login, refresh, me, change-password, forgot-password, verify-email |
| `/students` | CRUD, self-profile, stats |
| `/teachers` | CRUD, self-profile |
| `/academic/departments` | department CRUD |
| `/academic/courses` | course CRUD |
| `/academic/semesters` | semester CRUD, current semester |
| `/attendance` | take attendance, per-student/per-course history & summary |
| `/results` | record marks, CGPA calculation, top performers |
| `/assignments` | create, list, submit (multipart file upload), grade submissions |
| `/notifications` | notice board CRUD |
| `/fees` | fee records, payment status, summary |
| `/ai` | ask, generate-questions, summarize, study-plan, analyze, recommend-subjects, learning-roadmap |
| `/admin` | dashboard stats, analytics, activity logs |
| `/reports` | PDF report card, Excel attendance export |

### Authentication Flow

1. `POST /auth/register` or `/auth/login` returns a short-lived **access token** (30 min) and a longer-lived **refresh token** (7 days).
2. The frontend stores both in `localStorage` and attaches the access token as `Authorization: Bearer <token>` on every request (Axios request interceptor).
3. On a `401`, an Axios response interceptor transparently calls `POST /auth/refresh` with the refresh token, retries the original request with the new access token, and only redirects to `/login` if the refresh itself fails.
4. Role is embedded in the JWT payload; FastAPI dependencies (`get_current_admin`, `get_current_teacher`, `get_current_student`) enforce access control per-route, and the frontend's `<ProtectedRoute>` mirrors this for navigation.

---

## Database Design

MongoDB collections (all accessed through the service layer, never directly from routes):

| Collection | Purpose |
|---|---|
| `users` | Auth identity: email, password hash, role, verification state |
| `students` | Student profile, linked to `users` via `user_id` |
| `teachers` | Teacher profile, linked to `users` via `user_id` |
| `departments` | Academic departments |
| `courses` | Subjects, linked to a department and (optionally) a teacher |
| `semesters` | Academic terms, one flagged `is_current` |
| `attendance` | Per-student, per-course, per-date attendance records |
| `results` | Per-student, per-course, per-semester marks + derived grade/CGPA inputs |
| `assignments` | Coursework created by teachers |
| `submissions` | Student submissions against an assignment, with grading state |
| `notifications` | Notice board entries, targeted by role |
| `fees` | Fee records with payment status tracking |
| `activity_logs` | Audit trail (e.g. login events) surfaced on the admin dashboard |

Documents are enriched at read time (joining in names from `users`/`departments`/`courses`) rather than duplicating denormalized data at write time, keeping writes simple and reads self-contained for the frontend.

---

## Testing

### Backend

```bash
cd backend
pytest -v
```

Requires a running MongoDB instance (tests exercise the real service/database layer end-to-end — register → login → create department/course/student → record results → compute CGPA — rather than mocking Mongo). Each test uses randomized emails/codes so the suite is safe to re-run against the same database.

### Frontend

```bash
cd frontend
npm test          # single run
npm run test:watch
```

Uses Vitest + React Testing Library + jsdom to unit-test shared UI components (`Button`, `Input`, `Card`, `StatCard`) and utility functions (`cn`, `formatDate`, `getInitials`, `getGradeBadgeColor`).

---

## Deployment

### Frontend → Vercel

1. Import the repo into Vercel, set the **root directory** to `frontend`.
2. Vercel auto-detects Vite; `vercel.json` adds the SPA rewrite so client-side routes resolve on refresh.
3. Set the `VITE_API_URL` environment variable to your deployed backend, e.g. `https://smart-sms-api.onrender.com/api/v1`.

### Backend → Render

1. Push the repo to GitHub and create a new **Blueprint** in Render pointing at the repo — it will pick up [`render.yaml`](./render.yaml) at the root (`rootDir: backend`).
2. Fill in the marked secrets in the Render dashboard: `MONGODB_URL` (an Atlas connection string), `GEMINI_API_KEY`, and SMTP credentials if email is desired.
3. Update `CORS_ORIGINS` to your Vercel domain once it's known.
4. Render builds with `pip install -r requirements.txt` and starts with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; health checks hit `/health`.

### Database → MongoDB Atlas

Use a free M0 cluster for both environments' data. Run `python seed.py` once (locally, pointed at the Atlas URL via `.env`) to populate demo data in production.

---

## Security Notes

- Passwords are hashed with **bcrypt** (via Passlib) — plaintext passwords are never stored or logged.
- JWTs are signed with `HS256` using `SECRET_KEY`; access tokens are short-lived (30 min) and refresh tokens (7 days) are validated by type (`access` vs `refresh`) on every use.
- **Admin accounts cannot be created through public self-registration** — the `/auth/register` endpoint rejects `role: "admin"` with a `403`, closing off a privilege-escalation path. New admins must be seeded or created by an existing admin.
- Role-based dependencies (`get_current_admin`, `get_current_teacher`, `get_current_student`) gate every mutating endpoint; the frontend's route guards are a UX convenience, not the security boundary.
- File uploads are written under a server-controlled `uploads/` directory with generated UUID filenames, never the client-supplied filename.

---

## License

Released under the [MIT License](./LICENSE).
