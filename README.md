# Call Me Reminder

A phone call reminder application that automatically calls you at scheduled times to deliver your reminder message using Vapi AI voice calls.

## Features

- **Create Reminders**: Schedule phone call reminders with a title, message, phone number, date/time
- **Dashboard**: View all reminders with filtering (All/Scheduled/Completed/Failed) and search
- **Live Countdown**: See real-time countdown for upcoming reminders
- **Auto Timezone**: Automatically detects and stores your timezone
- **Voice Calls**: Uses Vapi AI to deliver spoken reminders at the scheduled time
- **Edit/Delete**: Modify or remove scheduled reminders

## Tech Stack

**Frontend**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (React Query)
- Lucide React icons

**Backend**
- Python 3.13
- FastAPI
- SQLAlchemy 2.0
- SQLite
- APScheduler
- Vapi AI for voice calls

## Design Decisions

Following the "minimal" principle from the assessment requirements:

1. **No Authentication**: Single-user system to reduce complexity. Production would add auth.

2. **SQLite Database**: Zero-configuration database perfect for local development. Easily swappable to PostgreSQL for production.

3. **APScheduler (In-Process)**: Background scheduler runs within the FastAPI process. Simpler than Celery+Redis while sufficient for this use case. Checks for due reminders every 30 seconds.

4. **Auto-detect Timezone**: Browser's timezone is automatically detected and stored with each reminder, avoiding timezone dropdown complexity.

5. **shadcn/ui Components**: Pre-built, accessible components that are customizable and don't add bundle bloat (components are copied into the project).

6. **TanStack Query**: Handles caching, refetching, and loading states. Auto-refreshes reminder list every 10 seconds.

7. **Phone Number Formatting**: Display formatting (readable) while storing E.164 format for API compatibility.

## Project Structure

```
call-me-reminder/
├── backend/
│   ├── main.py           # FastAPI app, routes, lifespan
│   ├── models.py         # SQLAlchemy ORM models
│   ├── schemas.py        # Pydantic validation schemas
│   ├── database.py       # Database connection
│   ├── scheduler.py      # APScheduler + Vapi integration
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js pages
│   │   ├── components/   # React components
│   │   │   ├── ui/       # shadcn/ui components
│   │   │   ├── reminder-form.tsx
│   │   │   ├── reminder-card.tsx
│   │   │   ├── reminder-list.tsx
│   │   │   └── empty-state.tsx
│   │   └── lib/
│   │       ├── api.ts    # API client
│   │       └── utils.ts  # Utilities
│   ├── .env.example
│   └── package.json
└── README.md
```

## Quick Start (Using Makefile)

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm
- Make (comes with Git Bash on Windows, or install via package manager)
- Vapi account (free tier works)

### 1. Configure Vapi

1. Create an account at [Vapi.ai](https://vapi.ai)
2. Get your API key from the dashboard
3. Create or import a phone number (Twilio integration)
4. Copy the phone number ID

```bash
# Copy and edit the environment file
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:
```env
VAPI_API_KEY=your_vapi_api_key_here
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id_here
```

### 2. Setup & Run

```bash
# Install all dependencies (backend + frontend)
make setup

# Run both servers (backend on :8000, frontend on :3000)
make run
```

That's it! Open http://localhost:3000 in your browser.

### Available Make Commands

| Command | Description |
|---------|-------------|
| `make setup` | Install all dependencies (backend + frontend) |
| `make run` | Run both backend and frontend servers |
| `make run-backend` | Run backend only |
| `make run-frontend` | Run frontend only |
| `make clean` | Remove venv, node_modules, and database |
| `make help` | Show all available commands |

---

## Manual Setup (Alternative)

If you don't have `make` available, follow these steps:

### 1. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your Vapi credentials
```

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file (optional)
cp .env.example .env.local
```

### 3. Run Servers

In separate terminals:

```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

- Backend API: http://localhost:8000
- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

## How Scheduling Works

1. **Reminder Creation**: When you create a reminder, it's stored in SQLite with `status: "scheduled"` and the UTC timestamp of when to trigger.

2. **Background Scheduler**: APScheduler runs a job every 30 seconds that:
   - Queries for reminders where `status = "scheduled"` AND `scheduled_at <= now`
   - For each due reminder, triggers a Vapi phone call
   - Updates status to `"completed"` or `"failed"` based on API response

3. **Vapi Call Flow**:
   - Backend sends POST to Vapi `/call` endpoint with transient assistant
   - Vapi initiates outbound call to the phone number
   - AI assistant speaks the reminder message
   - Call ID is stored for reference

## Testing the Call Workflow

1. Start both backend and frontend
2. Create a reminder for 2-3 minutes in the future
3. Watch the dashboard - countdown will show remaining time
4. When time is reached, the scheduler processes it (within 30 seconds)
5. You'll receive a phone call with your reminder message
6. Reminder status updates to "Completed" or "Failed"

### Quick Test (Without Real Calls)

If you don't have Vapi configured, the system will still work but reminders will be marked as "Failed" with an error message about missing configuration.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/reminders` | Create reminder |
| GET | `/reminders` | List reminders (with filters) |
| GET | `/reminders/{id}` | Get single reminder |
| PUT | `/reminders/{id}` | Update reminder |
| DELETE | `/reminders/{id}` | Delete reminder |

### Query Parameters for GET /reminders

- `status`: Filter by status (scheduled, completed, failed)
- `search`: Search in title/message
- `sort_by`: Sort field (default: scheduled_at)
- `sort_order`: asc or desc

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `VAPI_API_KEY` | Your Vapi API key |
| `VAPI_PHONE_NUMBER_ID` | Vapi phone number ID for outbound calls |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:8000) |

## Known Limitations

- Single-user (no auth)
- In-process scheduler (doesn't survive crashes; production would use separate worker)
- SQLite (fine for development; use PostgreSQL for production)
- 30-second polling interval (reminders may be delayed up to 30 seconds)

## License

MIT
