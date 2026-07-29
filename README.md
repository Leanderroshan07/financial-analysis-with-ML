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

## Environment Variables

Copy `.env.example` files in `backend/` and `frontend/`, then fill in your values.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Express.js, TypeScript, Prisma, PostgreSQL |
| ML | FastAPI, XGBoost, scikit-learn, pandas |
| Frontend | React 19, Vite, TanStack Query, Tailwind |
| Auth | JWT, bcryptjs |
