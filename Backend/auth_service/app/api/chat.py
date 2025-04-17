from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_active_user
from app.database import get_db
from app.models.chat import ChatHistory
from app.models.user import User
from app.schemas.chat import ChatHistoryCreate, ChatHistoryResponse

router = APIRouter()

@router.post("/chat", response_model=ChatHistoryResponse)
def create_chat_entry(
    chat_data: ChatHistoryCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    # Ensure the chat entry belongs to the current user
    if chat_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create chat entries for other users"
        )
    
    db_chat = ChatHistory(**chat_data.dict())
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    
    return db_chat

@router.get("/chat", response_model=List[ChatHistoryResponse])
def get_chat_history(
    current_user: Annotated[User, Depends(get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Get chat history for the current user only
    chat_history = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == current_user.id)
        .order_by(ChatHistory.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return chat_history

@router.get("/chat/{chat_id}", response_model=ChatHistoryResponse)
def get_chat_entry(
    chat_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    chat_entry = db.query(ChatHistory).filter(ChatHistory.id == chat_id).first()
    
    if not chat_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat entry not found"
        )
    
    # Ensure the chat entry belongs to the current user
    if chat_entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access chat entries of other users"
        )
    
    return chat_entry 