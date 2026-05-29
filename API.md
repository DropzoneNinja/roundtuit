# RoundTuit API Reference

Base URL: `http://localhost:4000` (dev) or your configured domain in production.

---

## Authentication

Two methods are supported. Choose based on your use case:

### Cookie (browser / interactive)

Log in via `POST /api/auth/login`. A JWT is set as an `httpOnly` cookie automatically. All mutating requests (POST, PUT, PATCH, DELETE) from a browser must also include:

```
x-requested-with: XMLHttpRequest
```

### API Key / Personal Access Token (programmatic)

Create a key via `POST /api/settings/api-keys` (requires an active session). Pass the token as a Bearer header on every request:

```
Authorization: Bearer rtpat_<your-token>
```

API keys do **not** require the `x-requested-with` header. The raw token is shown **once only** at creation — store it securely.

---

## Enums

| Enum | Values |
|---|---|
| `Importance` | `HIGH`, `MEDIUM`, `LOW` |
| `TaskStatus` | `PENDING`, `STARTED`, `WAITING`, `COMPLETED` |

---

## Endpoints

### Health

#### `GET /api/health`
No auth required.

**Response `200`**
```json
{ "status": "ok", "timestamp": "2026-05-29T12:00:00.000Z" }
```

---

### Auth

#### `POST /api/auth/login`

**Request**
```json
{ "username": "alice", "password": "YourPassword123" }
```

**Response `200`** — sets `token` cookie
```json
{ "user": { "id": "clx...", "username": "alice", "passwordChangeRequired": false } }
```

**Response `401`**
```json
{ "error": "Invalid credentials" }
```

---

#### `POST /api/auth/logout`

Clears the session cookie. No body required.

**Response `200`**
```json
{ "message": "Logged out" }
```

---

#### `GET /api/auth/me`
Auth required.

**Response `200`**
```json
{ "id": "clx...", "username": "alice", "passwordChangeRequired": false }
```

---

### Tasks

All task endpoints require auth.

#### `GET /api/tasks`

Returns all tasks sorted by: incomplete first → due date asc (undated last) → importance (HIGH→LOW) → newest first.

**Response `200`**
```json
[
  {
    "id": "clx...",
    "title": "Buy milk",
    "description": null,
    "dueDate": "2026-06-01T00:00:00.000Z",
    "importance": "HIGH",
    "status": "PENDING",
    "statusChangedAt": null,
    "imageUrl": null,
    "createdBy": "clx...",
    "createdAt": "2026-05-29T10:00:00.000Z",
    "updatedAt": "2026-05-29T10:00:00.000Z"
  }
]
```

---

#### `POST /api/tasks`

**Request**
```json
{
  "title": "Buy milk",
  "description": "Oat milk preferred",
  "dueDate": "2026-06-01",
  "importance": "HIGH"
}
```

All fields except `title` are optional. `dueDate` accepts ISO 8601 date or datetime strings.

**Response `201`** — returns the created task object.

---

#### `PUT /api/tasks/:id`

**Request** — any subset of task fields:
```json
{
  "title": "Buy oat milk",
  "status": "COMPLETED",
  "importance": "MEDIUM",
  "dueDate": "2026-06-02",
  "description": "From Aldi"
}
```

**Response `200`** — returns the updated task object.

---

#### `DELETE /api/tasks/:id`

**Response `204`** — no body.

---

#### `POST /api/tasks/:id/image`

Upload an image for a task. Send as `multipart/form-data` with field name `image`.

**Response `200`**
```json
{ "imageUrl": "/uploads/abc123.jpg" }
```

---

#### `DELETE /api/tasks/:id/image`

**Response `200`**
```json
{ "message": "Image removed" }
```

---

#### `GET /api/tasks/stats`

**Response `200`**
```json
{
  "total": 12,
  "open": 8,
  "completed": 4,
  "completionRate": 33.3,
  "overdue": 2,
  "byStatus": { "PENDING": 5, "STARTED": 2, "WAITING": 1, "COMPLETED": 4 },
  "byImportance": { "HIGH": 3, "MEDIUM": 7, "LOW": 2 }
}
```

---

#### `GET /api/tasks/sparklines`

28-day daily breakdown for sparkline charts.

**Response `200`**
```json
{
  "days": [
    {
      "date": "2026-05-01",
      "created": 1,
      "completed": 0,
      "open": 3,
      "overdue": 1,
      "completionRate": 0
    }
  ]
}
```

---

#### `GET /api/tasks/timeline`

12-month monthly summary.

**Response `200`**
```json
{
  "months": [
    {
      "month": "2026-05",
      "created": 5,
      "completed": 3,
      "onTime": 2,
      "late": 1,
      "avgCompletionDays": 2.4
    }
  ]
}
```

---

### Settings

#### `GET /api/settings/users`

**Response `200`**
```json
[
  { "id": "clx...", "username": "alice", "passwordChangeRequired": false, "createdAt": "..." }
]
```

---

#### `POST /api/settings/change-password`

**Request**
```json
{ "currentPassword": "OldPass123", "newPassword": "NewPass456" }
```

**Response `200`**
```json
{ "message": "Password changed" }
```

---

#### `POST /api/settings/reset-password`

Reset another user's password (sets a temporary password and flags `passwordChangeRequired`).

**Request**
```json
{ "userId": "clx..." }
```

**Response `200`**
```json
{ "tempPassword": "a1b2c3d4e5f6", "username": "bob" }
```

---

#### `GET /api/settings/audit`

Paginated audit log.

**Query params:** `limit` (1–500, default 100), `cursor` (ID of last item for pagination)

**Response `200`**
```json
{
  "logs": [
    {
      "id": "clx...",
      "action": "CREATE",
      "entity": "task",
      "entityId": "clx...",
      "actorId": "clx...",
      "actorUsername": "alice",
      "detail": {},
      "createdAt": "2026-05-29T10:00:00.000Z"
    }
  ],
  "nextCursor": "clx..."
}
```

---

### API Keys

#### `GET /api/settings/api-keys`

List your API keys. Token values are never returned.

**Response `200`**
```json
[
  {
    "id": "clx...",
    "name": "Home Assistant",
    "prefix": "rtpat_ab3f99",
    "lastUsedAt": "2026-05-28T18:00:00.000Z",
    "expiresAt": null,
    "createdAt": "2026-05-20T12:00:00.000Z"
  }
]
```

---

#### `POST /api/settings/api-keys`

Create a new API key. The `token` field is returned **once only** — save it immediately.

**Request**
```json
{
  "name": "Home Assistant",
  "expiresAt": "2027-01-01T00:00:00.000Z"
}
```

`expiresAt` is optional (omit for a non-expiring key).

**Response `201`**
```json
{
  "id": "clx...",
  "name": "Home Assistant",
  "prefix": "rtpat_ab3f99",
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "createdAt": "2026-05-29T10:00:00.000Z",
  "token": "rtpat_ab3f99c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8"
}
```

---

#### `DELETE /api/settings/api-keys/:id`

Revoke an API key. Immediately invalidates it.

**Response `204`** — no body.

---

### Telegram

#### `GET /api/telegram/status`

**Response `200`**
```json
{ "enabled": true, "linked": false, "linkCode": "a1b2c3d4" }
```

---

#### `POST /api/telegram/regenerate-code`

Generate a new Telegram pairing code.

**Response `200`**
```json
{ "linkCode": "e5f6a7b8" }
```

---

#### `POST /api/telegram/unlink`

Unlink Telegram from your account.

**Response `200`**
```json
{ "message": "Unlinked" }
```

---

#### `POST /api/telegram/test`

Send a test notification to your linked Telegram chat.

**Response `200`**
```json
{ "message": "Test notification sent" }
```

---

## Programmatic Quick Start

### 1. Create an API key (one-time, using your browser session)

```bash
# First, log in and save the cookie
curl -c cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'x-requested-with: XMLHttpRequest' \
  -d '{"username":"alice","password":"YourPassword123"}'

# Create an API key
curl -b cookies.txt -X POST http://localhost:4000/api/settings/api-keys \
  -H 'Content-Type: application/json' \
  -H 'x-requested-with: XMLHttpRequest' \
  -d '{"name":"My Script"}'
```

Save the `token` value from the response — it is shown once only.

### 2. Use the API key in scripts

```bash
export TUIT_TOKEN="rtpat_..."

# List all tasks
curl -H "Authorization: Bearer $TUIT_TOKEN" \
  http://localhost:4000/api/tasks

# Create a task
curl -X POST http://localhost:4000/api/tasks \
  -H "Authorization: Bearer $TUIT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Call the plumber","importance":"HIGH","dueDate":"2026-06-01"}'

# Mark a task completed
curl -X PUT http://localhost:4000/api/tasks/clx... \
  -H "Authorization: Bearer $TUIT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"COMPLETED"}'

# Revoke the key when done
curl -X DELETE http://localhost:4000/api/settings/api-keys/clx... \
  -H "Authorization: Bearer $TUIT_TOKEN"
```
