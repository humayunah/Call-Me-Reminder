from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from database import engine, get_db, Base
from models import Reminder, ReminderStatus
from schemas import ReminderCreate, ReminderUpdate, ReminderResponse
from scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="Call Me Reminder API",
    description="API for managing phone call reminders",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/reminders", response_model=ReminderResponse, status_code=201)
def create_reminder(reminder: ReminderCreate, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    scheduled_at = reminder.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

    if scheduled_at <= now:
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

    db_reminder = Reminder(
        title=reminder.title,
        message=reminder.message,
        phone_number=reminder.phone_number,
        scheduled_at=scheduled_at,
        timezone=reminder.timezone,
        status=ReminderStatus.SCHEDULED.value,
    )
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder


@app.get("/reminders", response_model=list[ReminderResponse])
def list_reminders(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in title or message"),
    sort_by: str = Query("scheduled_at", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
):
    query = db.query(Reminder)

    if status and status != "all":
        query = query.filter(Reminder.status == status)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Reminder.title.ilike(search_term),
                Reminder.message.ilike(search_term),
            )
        )

    if sort_order == "desc":
        query = query.order_by(getattr(Reminder, sort_by).desc())
    else:
        query = query.order_by(getattr(Reminder, sort_by).asc())

    return query.all()


@app.get("/reminders/{reminder_id}", response_model=ReminderResponse)
def get_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder


@app.put("/reminders/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    reminder_update: ReminderUpdate,
    db: Session = Depends(get_db),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    if reminder.status != ReminderStatus.SCHEDULED.value:
        raise HTTPException(
            status_code=400,
            detail="Cannot update a reminder that has already been processed",
        )

    update_data = reminder_update.model_dump(exclude_unset=True)

    if "scheduled_at" in update_data:
        scheduled_at = update_data["scheduled_at"]
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        if scheduled_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        update_data["scheduled_at"] = scheduled_at

    for field, value in update_data.items():
        setattr(reminder, field, value)

    db.commit()
    db.refresh(reminder)
    return reminder


@app.delete("/reminders/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    db.delete(reminder)
    db.commit()
    return None
