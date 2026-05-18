# RoundTuit — Implementation TODO

## Phase 1: Repository & Project Scaffolding

- [ ] 1.1 Create project root directory with the target folder structure (`frontend/`, `backend/`, `docker/`, `postgres/`, `nginx/`)
- [ ] 1.2 Initialize a root-level `.gitignore` covering `node_modules/`, `.env*`, `dist/`, `*.log`
- [ ] 1.3 Initialize git repository and make initial commit
- [ ] 1.4 Create root `.env.example` documenting every required variable (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `PORT`, `FRONTEND_URL`, `VITE_API_URL`)
- [ ] 1.5 Create `backend/` Node.js + TypeScript project: `npm init`, install dependencies (`express`/`fastify`, `prisma`, `@prisma/client`, `zod`, `argon2`, `jsonwebtoken`, `pino`, `pino-http`, `cors`, `helmet`, `express-rate-limit`, `cookie-parser`), install dev dependencies (`typescript`, `ts-node-dev`, `@types/*`)
- [ ] 1.6 Create `backend/tsconfig.json` targeting ES2022, `moduleResolution: bundler`, `strict: true`, `outDir: dist/`
- [ ] 1.7 Create `frontend/` Vite + React + TypeScript project via `npm create vite@latest frontend -- --template react-ts`
- [ ] 1.8 Install frontend dependencies: `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `axios`, `lucide-react`
- [ ] 1.9 Install and initialise Tailwind CSS in `frontend/` (`tailwind.config.ts`, `postcss.config.js`, import in `index.css`)
- [ ] 1.10 Initialise shadcn/ui in `frontend/` (`npx shadcn-ui@latest init`), choose CSS variables theme, set base color and radius
- [ ] 1.11 Add shadcn/ui components needed for the project: `button`, `card`, `input`, `label`, `textarea`, `select`, `checkbox`, `badge`, `dialog`, `dropdown-menu`, `form`, `toast`, `skeleton`, `separator`, `tooltip`

---

## Phase 2: Database Schema & Migrations

- [ ] 2.1 Create `backend/prisma/schema.prisma` with `datasource db` pointing to `DATABASE_URL` and `generator client`
- [ ] 2.2 Define `AllowedEmail` model: `id` (cuid), `email` (String, unique), `createdAt` (DateTime, default now)
- [ ] 2.3 Define `User` model: `id` (cuid), `email` (String, unique), `passwordHash` (String), `createdAt` (DateTime, default now), `updatedAt` (DateTime, updatedAt), relation to `Task[]`
- [ ] 2.4 Define `Task` model: `id` (cuid), `title` (String), `description` (String?), `dueDate` (DateTime?), `importance` (enum `Importance`), `completed` (Boolean, default false), `completedAt` (DateTime?), `createdBy` (FK to `User.id`), `createdAt` (DateTime, default now), `updatedAt` (DateTime, updatedAt)
- [ ] 2.5 Add Prisma `enum Importance { HIGH MEDIUM LOW }` block
- [ ] 2.6 Run `npx prisma migrate dev --name init` to generate and apply the first migration
- [ ] 2.7 Create `backend/prisma/seed.ts` that inserts the two allowed household emails into `AllowedEmail`
- [ ] 2.8 Configure `prisma/seed.ts` in `package.json` under `"prisma": { "seed": "ts-node prisma/seed.ts" }` and run `npx prisma db seed`
- [ ] 2.9 Verify schema by inspecting `npx prisma studio` and confirming all tables and columns match the spec

---

## Phase 3: Docker & Infrastructure Setup

- [ ] 3.1 Create `docker/Dockerfile.backend`: multi-stage build — `deps` installs prod deps, `build` compiles TypeScript, `runtime` copies `dist/` and `node_modules/` on `node:20-alpine`, exposes port 4000
- [ ] 3.2 Create `docker/Dockerfile.backend.dev`: single-stage `node:20-alpine`, copies source, installs all deps, runs `ts-node-dev` with hot reload
- [ ] 3.3 Create `docker/Dockerfile.frontend`: multi-stage — `build` runs `vite build`, `runtime` serves `dist/` via `nginx:alpine`
- [ ] 3.4 Create `docker/Dockerfile.frontend.dev`: `node:20-alpine`, runs `vite dev --host 0.0.0.0`
- [ ] 3.5 Create root `docker-compose.yml` (development) with services: `postgres` (image `postgres:16-alpine`, volume `pgdata`, healthcheck), `backend` (build `Dockerfile.backend.dev`, volume-mount `./backend:/app`, depends on postgres, env from `.env`), `frontend` (build `Dockerfile.frontend.dev`, volume-mount `./frontend:/app`, depends on backend), `nginx` (ports `80:80`, depends on both)
- [ ] 3.6 Create `nginx/dev.conf`: proxy `/api` to `backend:4000`, proxy `/` to `frontend:5173` with WebSocket upgrade headers for Vite HMR
- [ ] 3.7 Create root `docker-compose.prod.yml` using production Dockerfiles, no volume mounts, `restart: unless-stopped`, persistent named postgres volume
- [ ] 3.8 Create `nginx/prod.conf`: gzip enabled, security headers, `/api` proxied to backend, `/` serves static frontend with `try_files $uri /index.html`, HTTPS server block with SSL cert paths as commented placeholders
- [ ] 3.9 Create `postgres/init.sql` for Docker Postgres `docker-entrypoint-initdb.d/`
- [ ] 3.10 Add a `Makefile` with targets: `dev`, `prod`, `migrate`, `seed`, `logs`, `down`
- [ ] 3.11 Verify development stack: `docker compose up --build` — confirm postgres reachable, backend health endpoint responds, frontend HMR works

---

## Phase 4: Backend — Core & Auth

- [ ] 4.1 Create `backend/src/lib/prisma.ts` exporting a singleton `PrismaClient` instance
- [ ] 4.2 Create `backend/src/lib/logger.ts` exporting a configured `pino` logger (pretty-print in dev, JSON in prod)
- [ ] 4.3 Create `backend/src/config.ts` that reads and validates all environment variables with Zod; throw on startup if any are missing
- [ ] 4.4 Create `backend/src/app.ts`: register `helmet()`, `cors({ origin: FRONTEND_URL, credentials: true })`, `cookie-parser`, `express.json()`, `pino-http`; mount `/api` router; export app instance
- [ ] 4.5 Create `backend/src/server.ts` as entry point: import app, call `app.listen(PORT)`, log startup message
- [ ] 4.6 Create `backend/src/middleware/errorHandler.ts`: Express error-handler that logs with pino and returns `{ error: message }` JSON with appropriate status codes
- [ ] 4.7 Create `backend/src/middleware/authenticate.ts`: reads `Authorization: Bearer <token>` header or `token` httpOnly cookie, verifies JWT, attaches `req.user = { id, email }`, returns 401 if invalid
- [ ] 4.8 Define Zod schemas in `backend/src/schemas/auth.ts`: `registerSchema` (email, password min 8 chars), `loginSchema`
- [ ] 4.9 Create `backend/src/routes/auth.ts` with handlers:
  - `POST /register`: check `AllowedEmail`, check no duplicate `User`, hash with `argon2.hash()`, create user, sign JWT, set httpOnly cookie
  - `POST /login`: find user, verify with `argon2.verify()`, sign JWT, set httpOnly cookie
  - `POST /logout`: clear token cookie
  - `GET /me`: `authenticate` middleware, return `req.user`
- [ ] 4.10 Apply `express-rate-limit` (max 10 req / 15 min) to `POST /register` and `POST /login`
- [ ] 4.11 Mount `auth` router at `/api/auth` in `app.ts`
- [ ] 4.12 Verify with curl or `.http` file: non-allowlisted registration blocked, allowlisted succeeds, duplicate blocked, wrong password → 401, login sets cookie, `GET /me` works, logout clears cookie

---

## Phase 5: Backend — Tasks API

- [ ] 5.1 Define Zod schemas in `backend/src/schemas/task.ts`: `createTaskSchema` (title required, description optional, dueDate optional ISO string → Date, importance enum defaulting to MEDIUM), `updateTaskSchema` (all optional plus `completed`)
- [ ] 5.2 Create `backend/src/lib/taskSort.ts`: export `sortTasks(tasks: Task[]): Task[]` — incomplete before complete → dueDate ascending (nulls last) → importance HIGH > MEDIUM > LOW → createdAt descending
- [ ] 5.3 Create `backend/src/routes/tasks.ts`; apply `authenticate` middleware to all routes
- [ ] 5.4 Implement `GET /api/tasks`: fetch all tasks, apply `sortTasks`, return array
- [ ] 5.5 Implement `POST /api/tasks`: validate with `createTaskSchema`, create with `createdBy: req.user.id`, return 201
- [ ] 5.6 Implement `PUT /api/tasks/:id`: validate with `updateTaskSchema`, 404 if not found; if `completed` toggled to `true` set `completedAt = new Date()`; if toggled to `false` set `completedAt = null`; return updated task
- [ ] 5.7 Implement `DELETE /api/tasks/:id`: 404 if not found, delete, return 204
- [ ] 5.8 Mount `tasks` router at `/api/tasks` in `app.ts`
- [ ] 5.9 Add `GET /api/health` (no auth) returning `{ status: "ok", timestamp }` for Docker healthchecks
- [ ] 5.10 Verify: unauthenticated request → 401, sort order correct across all criteria, completing sets `completedAt`, un-completing clears it, delete returns 204

---

## Phase 6: Frontend — Project Setup & Shared Infrastructure

- [ ] 6.1 Configure `frontend/vite.config.ts`: proxy `/api` to `http://localhost:4000` (dev), enable `@vitejs/plugin-react`
- [ ] 6.2 Create `frontend/src/lib/api.ts`: axios instance with `baseURL: import.meta.env.VITE_API_URL ?? ''`, `withCredentials: true`; 401 response interceptor redirects to `/login`
- [ ] 6.3 Create `frontend/src/types/index.ts`: export interfaces `User`, `Task`, enum `Importance`
- [ ] 6.4 Create `frontend/src/lib/queryClient.ts`: `QueryClient` with `staleTime: 30_000` and `retry: 1`
- [ ] 6.5 Create `frontend/src/store/authStore.ts` (Zustand): `{ user: User | null, setUser, clearUser }`
- [ ] 6.6 Create `frontend/src/components/layout/AppLayout.tsx`: top nav with app name, user email, theme toggle, logout button, `<Outlet />`
- [ ] 6.7 Create `frontend/src/components/layout/AuthLayout.tsx`: centered card layout for login/register
- [ ] 6.8 Create `frontend/src/router/index.tsx`: public routes (`/login`, `/register`) in `AuthLayout`, protected routes (`/`) in `AppLayout` behind `<AuthGuard />`
- [ ] 6.9 Create `frontend/src/router/AuthGuard.tsx`: reads auth state, redirects to `/login` if unauthenticated, shows skeleton while loading
- [ ] 6.10 Update `frontend/src/main.tsx`: wrap in `<QueryClientProvider>`, `<RouterProvider>`, dark mode provider
- [ ] 6.11 Create `frontend/src/components/ui/ThemeToggle.tsx`: button with lucide `Sun`/`Moon` icons, toggles `dark` class on `<html>`, persists to `localStorage`
- [ ] 6.12 Add shadcn `Toaster` to root layout

---

## Phase 7: Frontend — Auth Pages

- [ ] 7.1 Create `frontend/src/lib/authSchemas.ts`: Zod `loginSchema` (email, password), `registerSchema` (email, password, confirmPassword with `.refine()` matching)
- [ ] 7.2 Create `frontend/src/api/auth.ts`: async functions `login(data)`, `register(data)`, `logout()`, `getMe()`
- [ ] 7.3 Create `frontend/src/pages/LoginPage.tsx`: `react-hook-form` + `zodResolver`, email/password fields, on success set auth state and navigate to `/`, on error show toast, link to `/register`
- [ ] 7.4 Create `frontend/src/pages/RegisterPage.tsx`: email/password/confirmPassword fields, on success navigate to `/login` with success toast, surface 403 allowlist error inline, link to `/login`
- [ ] 7.5 Wire nav bar logout: call `logout()`, clear auth state, navigate to `/login`
- [ ] 7.6 `AuthGuard` calls `GET /api/auth/me` on mount to rehydrate session; show full-screen skeleton while loading

---

## Phase 8: Frontend — Task Dashboard

- [ ] 8.1 Create `frontend/src/api/tasks.ts`: `getTasks()`, `createTask(data)`, `updateTask(id, data)`, `deleteTask(id)`
- [ ] 8.2 Create `frontend/src/hooks/useTasks.ts`: `useQuery` for `getTasks` (key `['tasks']`), `useMutation` hooks for create/update/delete each calling `invalidateQueries(['tasks'])` on success
- [ ] 8.3 Create `frontend/src/lib/taskUtils.ts`: `sortTasks` (mirrors backend logic for optimistic UI), `formatDueDate(date)` ("Today", "Tomorrow", "May 22", "Overdue"), `importanceColor(importance)` → Tailwind class
- [ ] 8.4 Create `frontend/src/pages/DashboardPage.tsx`: renders sorted task list, floating "Add Task" button (bottom-right, `Plus` icon), header with task count summary
- [ ] 8.5 Create `frontend/src/components/tasks/TaskCard.tsx`: shadcn `Card`, left `Checkbox` for quick-complete, title (strikethrough when done), description (truncated), due date badge, importance badge, edit/delete icon buttons; completed tasks at reduced opacity; smooth CSS transition
- [ ] 8.6 Create `frontend/src/components/tasks/TaskList.tsx`: renders `TaskCard` list; skeleton cards while loading; empty state with "No tasks yet" when empty
- [ ] 8.7 Create `frontend/src/components/tasks/AddTaskDialog.tsx`: shadcn `Dialog`, `react-hook-form` + Zod, fields for title/description/dueDate/importance, calls `createTask` on submit, resets and closes on success
- [ ] 8.8 Create `frontend/src/components/tasks/EditTaskDialog.tsx`: same form pre-populated with existing task, calls `updateTask` on submit
- [ ] 8.9 Create `frontend/src/components/tasks/DeleteTaskConfirmDialog.tsx`: confirmation `Dialog`, "Delete" (destructive) and "Cancel" buttons, calls `deleteTask` on confirm
- [ ] 8.10 Wire all dialogs into `DashboardPage.tsx` with `useState<Task | null>` for edit/delete target
- [ ] 8.11 Implement optimistic updates on the complete checkbox: React Query `onMutate` / `onError` rollback so UI responds immediately
- [ ] 8.12 Add visual grouping in `TaskList`: divider between incomplete and complete tasks with collapsible "Completed (N)" section

---

## Phase 9: Polish & UX

- [ ] 9.1 Audit all forms for accessible labels, `aria-describedby` on error messages, and keyboard navigability
- [ ] 9.2 Add page title updates (`document.title`) per route
- [ ] 9.3 Due date urgency: amber badge for due today, red badge for overdue, default for future
- [ ] 9.4 Add shadcn `Tooltip` on importance badges showing full label text
- [ ] 9.5 Add error-state handling for the tasks query: retry button on error, friendly empty state
- [ ] 9.6 Ensure fully responsive: single-column on mobile, comfortable max-width on desktop, min 44px tap targets
- [ ] 9.7 Test and refine dark mode: verify all shadcn components and custom colours use CSS variables correctly in both modes
- [ ] 9.8 Ensure all API error responses surface a human-readable toast message
- [ ] 9.9 401 interceptor: clear auth state and show "Session expired, please log in again" toast before redirecting
- [ ] 9.10 Add enter/exit CSS transitions to task cards (or `framer-motion` if preferred)
- [ ] 9.11 Add loading spinner on all form submit buttons while requests are in-flight

---

## Phase 10: Security Hardening

- [ ] 10.1 Confirm `helmet()` applies `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` on all backend responses
- [ ] 10.2 Implement CSRF protection via custom header check (`X-Requested-With`) on all mutating endpoints; configure axios to send the header automatically
- [ ] 10.3 Verify rate limiting is active on auth routes; add general API limit of 200 req / 15 min per IP
- [ ] 10.4 Use Zod `strip` mode on all schemas to reject unknown extra fields and prevent mass assignment
- [ ] 10.5 Confirm all Prisma queries use parameterised queries (default) — no raw SQL with user input
- [ ] 10.6 Verify JWT secret is minimum 32 random bytes; set a sensible `JWT_EXPIRES_IN` (e.g. `7d`)
- [ ] 10.7 Set `Secure; HttpOnly; SameSite=Strict` cookie flags when `NODE_ENV === 'production'`

---

## Phase 11: Production Readiness

- [ ] 11.1 Create `backend/.env.example` and `frontend/.env.example` with all required variables and placeholder values; commit examples, keep actuals in `.gitignore`
- [ ] 11.2 Create `docker/entrypoint.backend.sh`: runs `npx prisma migrate deploy` then `node dist/server.js`; set as `ENTRYPOINT` in `Dockerfile.backend`
- [ ] 11.3 Add Docker healthcheck to backend service: `CMD curl -f http://localhost:4000/api/health || exit 1`, interval 30s, retries 3
- [ ] 11.4 Add Docker healthcheck to postgres service using `pg_isready`
- [ ] 11.5 Set `NODE_ENV=production` in `docker-compose.prod.yml`; confirm pino outputs structured JSON
- [ ] 11.6 Configure `nginx/prod.conf` with HTTPS server block (port 443), SSL cert paths as documented placeholders, HTTP → HTTPS redirect on port 80
- [ ] 11.7 Add gzip in Nginx prod config for `text/html`, `text/css`, `application/javascript`, `application/json`
- [ ] 11.8 Set `Cache-Control: max-age=31536000, immutable` for Vite-hashed assets (`/assets/`); `no-cache` for `index.html`
- [ ] 11.9 Document production deployment checklist in `PROJECT.md`: generate secrets, copy `.env.example` → `.env`, set values, run `docker compose -f docker-compose.prod.yml up -d --build`, run seed on first deploy
- [ ] 11.10 Verify end-to-end production build: Nginx serves frontend, API routes correctly, auth flow completes, tasks CRUD works
- [ ] 11.11 Run `npm audit` in both `frontend/` and `backend/`; address any high/critical vulnerabilities

---

## Phase 12: Testing & Final Verification

- [ ] 12.1 Write backend integration tests (`jest` + `supertest`) for auth: register success, non-allowlisted blocked, duplicate blocked, login wrong password → 401, logout, `GET /me`
- [ ] 12.2 Write backend integration tests for tasks: sort order correct, POST creates task, PUT complete sets `completedAt`, PUT uncomplete clears it, DELETE returns 204, unauthenticated → 401
- [ ] 12.3 Write unit tests for `sortTasks` covering all edge cases (null due dates, all same importance, mixed states)
- [ ] 12.4 Write frontend component tests (`vitest` + `@testing-library/react`) for `TaskCard`: renders title, complete toggle calls mutation, strikethrough when completed
- [ ] 12.5 Write frontend component tests for `AddTaskDialog`: validation errors shown, correct payload submitted, closes on success
- [ ] 12.6 Set up `@playwright/test` or `cypress` E2E smoke test: load → redirected to login → login → create task → mark complete → delete → logout
- [ ] 12.7 Run full test suite inside Docker and confirm all tests pass
- [ ] 12.8 Manual walkthrough of all user-facing flows in light and dark mode on desktop and mobile viewport
- [ ] 12.9 Run `npx tsc --noEmit` in both `frontend/` and `backend/`; resolve all TypeScript errors
- [ ] 12.10 Run `npm audit` in both directories; address any high or critical vulnerabilities
