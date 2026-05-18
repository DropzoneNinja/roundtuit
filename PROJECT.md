# PROJECT.md — RoundTuit

## Project Overview

RoundTuit is a lightweight shared household task management web application.

The primary goal is simplicity:
- One person (wife) can add tasks
- Another person (husband) can complete tasks
- Tasks can optionally include:
  - due/completion date
  - importance level
  - completion status

The application should feel modern, clean, responsive, and fast.

This application is intended for internet exposure, so authentication and security are mandatory.

---

# Core Features

## Authentication

### Requirements

- Users MUST authenticate to use the application.
- Only pre-approved email addresses may register.
- Registration is invitation-based via email allowlist.
- Unauthorized emails cannot create accounts.

### Authentication Flow

1. Admin manually adds allowed email addresses to database/config.
2. User visits registration page.
3. User enters:
   - allowed email
   - password
4. If email exists in allowlist:
   - account is created
5. If email is NOT allowlisted:
   - registration denied

### Login

- Email + password authentication
- Secure password hashing using bcrypt/argon2
- JWT or secure session cookies
- Persistent login support
- Logout capability

### Security Requirements

- HTTPS-ready deployment
- Password hashing mandatory
- CSRF protection
- Rate limiting on login endpoints
- Input validation on all APIs
- Secure HTTP headers
- SQL injection prevention
- Docker secrets or environment variables for secrets
- No hardcoded credentials

---

# Task Management

## Task Fields

Each task contains:

| Field | Type | Required |
|---|---|---|
| id | UUID | yes |
| title | string | yes |
| description | text | no |
| dueDate | datetime | no |
| importance | enum(high, medium, low) | no |
| completed | boolean | yes |
| completedAt | datetime | no |
| createdAt | datetime | yes |
| updatedAt | datetime | yes |
| createdBy | user reference | yes |

---

# Sorting Logic

Tasks should automatically sort using the following priority order:

## Primary Sort
1. Incomplete tasks first
2. Earlier due dates first
3. Tasks with no due date after dated tasks

## Secondary Sort
Importance priority:
1. High
2. Medium
3. Low

## Final Sort
Newest created tasks first

---

# UI / UX Requirements

## Design Goals

The UI should feel:
- modern
- minimal
- soft
- polished
- responsive
- mobile-friendly
- pleasant to use daily

Avoid:
- clutter
- enterprise styling
- excessive configuration

### Visual Style

Suggested styling direction:
- rounded cards
- subtle shadows
- smooth animations
- clean typography
- soft spacing
- muted colors with one accent color

### Theme Support

- Light mode
- Dark mode
- Remember user preference

---

# Pages

## Login Page

Features:
- Email field
- Password field
- Login button
- Link to registration page

---

## Registration Page

Features:
- Email field
- Password field
- Confirm password field
- Registration validation
- Allowlist validation

---

## Main Task Dashboard

Features:
- Task list
- Add task button
- Quick complete checkbox
- Inline editing
- Sort automatically
- Mobile responsive layout

---

# Task Card Requirements

Each task card should display:

- Title
- Optional description
- Due date
- Importance indicator
- Completion checkbox
- Created date

Visual indicators:
- Overdue tasks highlighted subtly
- Completed tasks visually muted
- High priority tasks visually distinct

---

# Task Creation

## Required Fields
- title

## Optional Fields
- description
- due date
- importance

---

# Technical Stack

## Frontend

### Requirements

- React
- TypeScript
- Vite

### Recommended Libraries

| Purpose | Library |
|---|---|
| Routing | react-router-dom |
| API | axios |
| State | Zustand or React Query |
| Forms | react-hook-form |
| Validation | zod |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Icons | lucide-react |

---

## Backend

### Requirements

- Node.js
- TypeScript
- Express or Fastify

### Recommended Libraries

| Purpose | Library |
|---|---|
| ORM | Prisma |
| Validation | zod |
| Auth | Passport or JWT |
| Password Hashing | argon2 |
| Logging | pino |

---

## Database

### Requirements

- PostgreSQL
- Dockerized
- Persistent volume storage

---

# Docker Requirements

## Deployment Philosophy

The entire application MUST run entirely through Docker Compose.

No local host dependencies should be required besides:
- Docker
- Docker Compose

---

# Required Services

## frontend
React frontend container

## backend
Node.js API container

## postgres
PostgreSQL database container

## reverse-proxy
Nginx or Traefik container

---

# Docker Compose Requirements

## Development Mode

Requirements:
- hot reload
- mounted source volumes
- easy local startup

Command:
```bash
docker compose up
```

---

## Production Mode

Requirements:
- optimized builds
- static frontend serving
- secure environment handling
- persistent database volumes
- restart policies

Command:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

# Environment Variables

## Backend

```env
DATABASE_URL=
JWT_SECRET=
PORT=
NODE_ENV=
ALLOWED_EMAIL_DOMAINS=
```

## Frontend

```env
VITE_API_URL=
```

---

# API Requirements

## Authentication Endpoints

| Method | Endpoint |
|---|---|
| POST | /api/auth/register |
| POST | /api/auth/login |
| POST | /api/auth/logout |
| GET | /api/auth/me |

---

## Task Endpoints

| Method | Endpoint |
|---|---|
| GET | /api/tasks |
| POST | /api/tasks |
| PUT | /api/tasks/:id |
| DELETE | /api/tasks/:id |

---

# Database Schema

## Users Table

```sql
users
- id
- email
- password_hash
- created_at
```

## Allowed Emails Table

```sql
allowed_emails
- id
- email
- created_at
```

## Tasks Table

```sql
tasks
- id
- title
- description
- due_date
- importance
- completed
- completed_at
- created_by
- created_at
- updated_at
```

---

# Non-Functional Requirements

## Performance

- Fast page loads
- Responsive UI
- Efficient database queries

## Accessibility

- Keyboard accessible
- Proper labels
- ARIA support where appropriate

## Maintainability

- Clean folder structure
- Strong typing
- Modular architecture
- Reusable components

---

# Suggested Folder Structure

```text
project-root/
├── frontend/
├── backend/
├── docker/
├── postgres/
├── nginx/
├── docker-compose.yml
├── docker-compose.prod.yml
└── PROJECT.md
```

---

# Recommended Enhancements (Future)

These should NOT be implemented initially, but architecture should allow them later.

## Future Features

- Push notifications
- Email reminders
- Recurring tasks
- Categories/tags
- Drag-and-drop prioritization
- Multi-user households
- Calendar view
- Attachment uploads
- PWA/mobile install support

---

# Acceptance Criteria

The project is complete when:

- Users can securely register using approved emails
- Users can login/logout
- Tasks can be created, edited, completed, and deleted
- Tasks automatically sort correctly
- UI is modern and responsive
- Entire application runs through Docker Compose
- Production deployment works using Docker Compose
- PostgreSQL persists data correctly
- Authentication is secure
- Application is internet-safe for self-hosting

---

# Development Philosophy

This project should prioritize:
1. Simplicity
2. Reliability
3. Clean UI
4. Maintainability
5. Security

Avoid unnecessary complexity and over-engineering.