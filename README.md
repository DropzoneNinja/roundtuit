<p align="center">
  <img src="./frontend/public/logo.png" alt="RoundTuit Logo" width="240">
</p>

<h1 align="center">RoundTuit</h1>

<p align="center">
A simple shared household task manager designed to help couples stay organized without constant reminders.
</p>

---

# Overview

RoundTuit is a lightweight web application built for one very specific purpose:

Helping wives easily create and manage task lists for their husbands in a way that is always visible, organized, and difficult to forget.

Instead of:
- verbal reminders
- sticky notes
- text messages
- repeating the same requests multiple times

RoundTuit provides a single shared location where tasks can be:
- added quickly
- prioritized
- scheduled
- tracked
- completed

The goal is not project management.

The goal is household harmony.

---

# Core Philosophy

RoundTuit was intentionally designed to be:

- simple
- fast
- clean
- mobile friendly
- easy to use daily
- low friction

No complex workflows.
No unnecessary features.
No enterprise-style clutter.

Just a modern shared list that keeps everybody on the same page.

---

# Features

## Shared Task Dashboard

Create and manage a household todo list that is automatically prioritized.

Tasks can include:
- title
- optional description
- optional due date
- importance level
- completion status

---

## Smart Automatic Sorting

Tasks are automatically sorted by:

1. Incomplete tasks first
2. Earliest due dates first
3. Highest importance first
4. Newest tasks last

This ensures the most urgent and important items naturally rise to the top.

---

## Importance Levels

Tasks can be marked as:
- High
- Medium
- Low

This allows quick visual prioritization without overcomplicating the workflow.

---

## Secure Authentication

RoundTuit is designed for internet exposure and secure self-hosting.

Features include:
- login authentication
- password hashing
- approved-email registration
- protected API access
- Docker-based deployment

Only pre-approved email addresses can create accounts.

---

# Technology Stack

## Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

## Backend
- Node.js
- TypeScript
- Express or Fastify
- Prisma ORM

## Database
- PostgreSQL

## Deployment
- Docker Compose

---

# Design Goals

The user interface should feel:
- modern
- soft
- responsive
- polished
- pleasant to use every day

The application is intended to work equally well on:
- desktop
- tablets
- phones

---

# Screenshots

Coming soon.

---

# Project Structure

```text
project-root/
├── frontend/
├── backend/
├── docker/
├── postgres/
├── nginx/
├── docs/
│   └── logo.png
├── docker-compose.yml
├── docker-compose.prod.yml
├── PROJECT.md
└── README.md
```

---

# Development

## Requirements

- Docker
- Docker Compose

No additional local dependencies are required.

---

# Running Locally

## Development

```bash
docker compose up
```

---

## Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

# Security

RoundTuit is designed with secure self-hosting in mind.

Security features include:
- password hashing
- JWT/session authentication
- API validation
- CSRF protection
- secure environment variable handling
- HTTPS-ready deployment
- rate limiting

---

# Future Enhancements

Potential future features include:
- push notifications
- recurring tasks
- email reminders
- calendar view
- PWA support
- multiple households
- drag-and-drop prioritization

---

# Why "RoundTuit"?

Because now they will finally get a RoundTuit for getting things done.

---

# License

MIT License