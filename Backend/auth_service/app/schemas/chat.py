from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class ChatHistoryBase(BaseModel):
    message: str
    response: str


class ChatHistoryCreate(ChatHistoryBase):
    user_id: int


class ChatHistoryResponse(ChatHistoryBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True 