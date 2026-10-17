from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class WidgetEvent(BaseModel):
    type: str
    data: dict
    at: float


class TutorRequest(BaseModel):
    system: str
    moon_id: str
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    completed: list[str] = []
    widget_events: list[WidgetEvent] = []