from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
import re


class ReminderBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1)
    phone_number: str = Field(..., pattern=r"^\+[1-9]\d{1,14}$")
    scheduled_at: datetime
    timezone: str = Field(..., min_length=1)

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+[1-9]\d{1,14}$", v):
            raise ValueError("Phone number must be in E.164 format (e.g., +14155552671)")
        return v


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    message: Optional[str] = Field(None, min_length=1)
    phone_number: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    timezone: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r"^\+[1-9]\d{1,14}$", v):
            raise ValueError("Phone number must be in E.164 format (e.g., +14155552671)")
        return v


class ReminderResponse(ReminderBase):
    id: int
    status: str
    call_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
