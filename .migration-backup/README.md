# ViewOnce Airbnb Stays

Airbnb-like property booking platform with PWA frontend, NestJS backend, Supabase integration, real-time features, payments, and admin dashboards.

## Features
- Progressive Web App (PWA) with offline support
- Real-time chat and notifications (Socket.io)
- Property management for hosts
- Booking system with unit availability
- AI recommendations and chat
- Multi-admin dashboards (Admin, Host, Support)
- M-Pesa/STK payments integration
- Reviews and ratings system

## Tech Stack
- **Frontend**: Next.js 15, React 18, Tailwind CSS, Leaflet maps
- **Backend**: NestJS 10, TypeORM, PostgreSQL
- **Database**: Supabase/PostgreSQL
- **Real-time**: Socket.io WebSockets
- **Payments**: Stripe, M-Pesa
- **Deployment**: Vercel (frontend), Render/Docker (backend)

## Quick Start

1. Clone repo: `git clone --recursive https://github.com/yourusername/viewonce-airbnb-stays.git`
2. Frontend: `cd frontend && npm install && npm run dev`
3. Backend: `cd backend && npm install && npm run start:dev`

## Deployment Troubleshooting (Vercel Warnings Fix)

### 1. Node.js Engines Warning
**Issue**: `engines: { "node": ">=20.9.0" }` triggers auto-upgrade warning.
**Fix**: Updated to `"^20.18.0"` (Node 20 LTS). Redeploy to clear.

### 2. Git Submodules Warning
**Issue**: `Failed to fetch one or more git submodules`
**Fix**: 
```bash
git submodule update --init --recursive
git add .gitmodules
git commit -m "Initialize submodules"
```
If no submodules needed, warning is harmless (Vercel shallow clone).

### Vercel-resilient build
If you can't modify the remote immediately, add a resilient build command so Vercel won't fail or warn when submodules are missing. The project includes a `vercel-build` script that will attempt to initialize submodules but will not fail the build if none exist:

```bash
npm run vercel-build
```

To use this in Vercel, set the project's Build Command to `npm run vercel-build` (instead of `npm run build`).

### Vercel Deployment
```bash
npm run build
vercel --prod
```

## Backend Deployment (Docker/Render)
```bash
cd backend
docker-compose up -d
```

See TODO_VERCEL_WARNINGS.md for progress.
