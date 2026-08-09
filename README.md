# Moneyyy — AI Financial Purchase Advisor

A full-stack AI-powered financial advisory platform that helps users track expenses, manage accounts, set financial goals, and receive smart purchase recommendations.

## Architecture

```
moneyyy/
├── backend/          # Express.js + TypeScript API (Prisma ORM)
├── fastapi/          # Python ML service (XGBoost, scikit-learn)
├── frontend/         # React + Vite + TypeScript SPA
└── archive/          # Phase experiments (local only)
```

- **Backend** — RESTful API with auth, accounts, transactions, goals, EMIs, subscriptions, and purchase-advisor endpoints. Prisma for DB, JWT for auth.
- **FastAPI ML Service** — Purchase prediction model using XGBoost with feature engineering. Serves predictions via REST endpoints.
- **Frontend** — React 19 SPA with TanStack Query, React Hook Form, and dark-mode UI.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL / SQLite (Prisma)

### Setup

```bash
# 1. Backend
cd backend
cp .env.example .env    # edit DB credentials
npm install
npx prisma generate
npx prisma db push       # sync schema
npm run dev              # http://localhost:3001

# 2. ML Service
cd ../fastapi
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd ../frontend
npm install
npm run dev              # http://localhost:5173

# 4. Or run all at once (root)
cd ..
npm install
npm run dev
```

## Desktop App (Electron)

The project includes an Electron desktop wrapper (`desktop/`) that packages the React SPA and connects it to the hosted backend + ML services (internet connection required).

### Dev mode (hot reload)

```bash
npm install               # root deps
cd desktop && npm install # electron + electron-vite
npm run desktop:dev       # from repo root: starts Vite + Electron window
```

### Package a Windows installer

Make sure `frontend/dist` is built (the script does it automatically):

```bash
npm run desktop:dist:win
```

Installer output: `desktop/dist/Moneyyy Setup 1.0.0.exe`. An unpacked build lands in `desktop/dist/win-unpacked/` for testing.

### How it works

- `desktop/src/main/index.ts` — creates the BrowserWindow, registers the `app://` protocol that serves `frontend/dist`, and injects permissive CORS headers so renderer API calls reach the hosted backend.
- `desktop/src/preload/index.ts` — minimal contextBridge API.
- The packaged app ships `frontend/dist` into `resources/renderer` via `extraResources`.
- The packaged backend serves `app://desktop/index.html`; the React app uses `VITE_API_URL=https://moneyyy-backend.onrender.com` from `.env.production` for API calls.

> Local development backend: `npm run dev` at root still runs the full stack (Express + FastAPI + Vite) — the Electron wrapper is independent of that.

## Environment Variables

Copy `.env.example` files in `backend/` and `frontend/`, then fill in your values.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Express.js, TypeScript, Prisma, PostgreSQL |
| ML | FastAPI, XGBoost, scikit-learn, pandas |
| Frontend | React 19, Vite, TanStack Query, Tailwind |
| Auth | JWT, bcryptjs |
