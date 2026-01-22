import httpx
import os
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from database import SessionLocal
from models import Reminder, ReminderStatus

scheduler = BackgroundScheduler()


def get_vapi_client() -> httpx.Client:
    return httpx.Client(
        base_url="https://api.vapi.ai",
        headers={
            "Authorization": f"Bearer {os.getenv('VAPI_API_KEY', '')}",
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )


def trigger_vapi_call(reminder: Reminder, db: Session) -> bool:
    """Trigger a Vapi call for the given reminder."""
    vapi_api_key = os.getenv("VAPI_API_KEY")
    vapi_phone_number_id = os.getenv("VAPI_PHONE_NUMBER_ID")

    if not vapi_api_key or not vapi_phone_number_id:
        reminder.status = ReminderStatus.FAILED.value
        reminder.error_message = "Vapi API key or phone number ID not configured"
        db.commit()
        return False

    try:
        with get_vapi_client() as client:
            # Using POST /call endpoint with transient assistant
            # Docs: https://docs.vapi.ai/api-reference/calls/create
            response = client.post(
                "/call",
                json={
                    "phoneNumberId": vapi_phone_number_id,
                    "customer": {
                        "number": reminder.phone_number,
                    },
                    "assistant": {
                        "name": "Reminder Assistant",
                        "firstMessage": f"Hello! This is your reminder: {reminder.title}. {reminder.message}",
                        "model": {
                            "provider": "openai",
                            "model": "gpt-4o",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": f"You are a friendly reminder assistant. Your only job is to deliver this reminder message: '{reminder.message}'. After delivering the message, ask if they have any questions about the reminder, then politely end the call. Keep your responses brief and helpful.",
                                }
                            ],
                        },
                        "voice": {
                            "provider": "11labs",
                            "voiceId": "21m00Tcm4TlvDq8ikWAM",
                        },
                    },
                },
            )

            if response.status_code in (200, 201):
                data = response.json()
                reminder.status = ReminderStatus.COMPLETED.value
                reminder.call_id = data.get("id")
                db.commit()
                return True
            else:
                reminder.status = ReminderStatus.FAILED.value
                reminder.error_message = f"Vapi API error: {response.status_code} - {response.text}"
                db.commit()
                return False

    except Exception as e:
        reminder.status = ReminderStatus.FAILED.value
        reminder.error_message = f"Failed to trigger call: {str(e)}"
        db.commit()
        return False


def process_due_reminders():
    """Check for due reminders and trigger calls."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_reminders = (
            db.query(Reminder)
            .filter(
                Reminder.status == ReminderStatus.SCHEDULED.value,
                Reminder.scheduled_at <= now,
            )
            .all()
        )

        for reminder in due_reminders:
            print(f"Processing reminder {reminder.id}: {reminder.title}")
            trigger_vapi_call(reminder, db)

    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler."""
    scheduler.add_job(
        process_due_reminders,
        trigger=IntervalTrigger(seconds=30),
        id="process_reminders",
        replace_existing=True,
    )
    scheduler.start()
    print("Scheduler started - checking for due reminders every 30 seconds")


def shutdown_scheduler():
    """Shutdown the scheduler."""
    scheduler.shutdown()
