# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RoundTuit** is a lightweight shared household task management web app. Two users share an instance: one adds tasks, the other completes them. See [PROJECT.md](PROJECT.md) for the full specification.

## Commands

### Development
```bash
docker compose up          # start all services with hot reload
```

### Production
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Backend (inside container or after `cd backend`)
```bash
npx prisma migrate dev     # run DB migrations
npx prisma studio          # open Prisma GUI
```

> No local Node.js or Postgres is required — everything runs through Docker Compose.

## Architecture

### Monorepo Layout
```
project-root/
├── frontend/        # React + TypeScript + Vite
├── backend/         # Node.js + TypeScript + Express or Fastify
├── docker/          # Dockerfiles
├── postgres/        # DB init scripts if any
├── nginx/           # Reverse proxy config
├── docker-compose.yml
└── docker-compose.prod.yml
```

### Stack Decisions
| Layer | Choice |
|---|---|
| Frontend | React, TypeScript, Vite |
| Routing | react-router-dom |
| State / Data | Zustand or React Query |
| Forms | react-hook-form + Zod |
| Styling | Tailwind CSS + shadcn/ui + lucide-react |
| Backend | Node.js + TypeScript + Express or Fastify |
| ORM | Prisma |
| Validation | Zod |
| Auth | JWT or secure session cookies (Passport optional) |
| Passwords | argon2 |
| Logging | pino |
| Database | PostgreSQL (Dockerized) |
| Proxy | Nginx or Traefik |

### Authentication
- **Allowlist-only registration**: only emails in the `allowed_emails` table may create accounts. Unapproved emails are rejected at registration.
- Login: email + password → JWT or session cookie with persistent login support.
- Admin adds allowed emails directly to the database.

### Database Schema
Three tables: `users`, `allowed_emails`, `tasks`. See PROJECT.md for full column list. Tasks reference `users.id` via `created_by`.

### Task Sorting (server-side or client-side)
Apply in this exact priority order:
1. Incomplete tasks before completed tasks
2. Earlier `due_date` first; tasks with no due date come after dated tasks
3. `importance`: high → medium → low
4. Newest `created_at` first

### API Endpoints
- `POST /api/auth/register` — validates against allowlist, creates user
- `POST /api/auth/login` — returns token/session
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `GET/POST /api/tasks`
- `PUT/DELETE /api/tasks/:id`

### Environment Variables
**Backend** (`.env`): `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `ALLOWED_EMAIL_DOMAINS`
**Frontend** (`.env`): `VITE_API_URL`

## Key Constraints

- The entire application must run through Docker Compose — no host-level Node or Postgres dependencies.
- Security is mandatory: HTTPS-ready, CSRF protection, rate limiting on auth endpoints, secure HTTP headers, input validation via Zod on all API routes.
- Do **not** implement future features listed in PROJECT.md (push notifications, recurring tasks, drag-and-drop, etc.) until the core acceptance criteria are met.
- Prioritize simplicity over abstraction — avoid over-engineering.
