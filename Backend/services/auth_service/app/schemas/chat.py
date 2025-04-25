from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class ChatBase(BaseModel):
    name: str = "Новый чат"


class ChatCreate(ChatBase):
    user_id: int


class ChatUpdate(ChatBase):
    pass


class ChatResponse(ChatBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatHistoryBase(BaseModel):
    message: str
    response: str
    recommendations: Optional[str] = None  # Recommendations for BPMN diagrams
    piperflow_text: Optional[str] = None  # PiperFlow text for BPMN diagrams


class ChatHistoryCreate(ChatHistoryBase):
    user_id: int
    chat_id: int


class ChatHistoryUpdate(BaseModel):
    message: Optional[str] = None
    response: Optional[str] = None
    recommendations: Optional[str] = None
    piperflow_text: Optional[str] = None


class ChatHistoryResponse(ChatHistoryBase):
    id: int
    user_id: int
    chat_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True 