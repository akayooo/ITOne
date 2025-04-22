from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from services.auth_service.app.api.auth import get_current_active_user
from services.auth_service.app.database import get_db
from services.auth_service.app.models.chat import Chat, ChatHistory
from services.auth_service.app.models.user import User as UserModel
from services.auth_service.app.schemas.chat import ChatCreate, ChatResponse, ChatUpdate, ChatHistoryCreate, ChatHistoryResponse

router = APIRouter()

# Chat endpoints
@router.get("/chats", response_model=List[ChatResponse])
def get_chats(
    current_user: Annotated[UserModel, Depends(get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all chats for the current user"""
    chats = (
        db.query(Chat)
        .filter(Chat.user_id == current_user.id)
        .order_by(Chat.updated_at.desc(), Chat.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return chats

@router.post("/chats", response_model=ChatResponse)
def create_chat(
    chat_data: ChatCreate,
    current_user: Annotated[UserModel, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """Create a new chat for the current user"""
    if chat_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create chats for other users"
        )
    
    db_chat = Chat(**chat_data.model_dump())
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    
    return db_chat

@router.get("/chats/{chat_id}", response_model=ChatResponse)
def get_chat(
    chat_id: int,
    current_user: Annotated[UserModel, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """Get a specific chat by ID"""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access chats of other users"
        )
    
    return chat

@router.put("/chats/{chat_id}", response_model=ChatResponse)
def update_chat(
    chat_id: int,
    chat_data: ChatUpdate,
    current_user: Annotated[UserModel, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """Update a chat name"""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify chats of other users"
        )
    
    # Update chat data
    for key, value in chat_data.model_dump().items():
        setattr(chat, key, value)
    
    db.commit()
    db.refresh(chat)
    
    return chat

@router.delete("/chats/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    chat_id: int,
    current_user: Annotated[UserModel, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """Delete a chat and all its messages"""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete chats of other users"
        )
    
    db.delete(chat)
    db.commit()

# Chat History endpoints
@router.post("/chat", response_model=ChatHistoryResponse)
def create_chat_entry(
    chat_data: ChatHistoryCreate,
    current_user: Annotated[UserModel, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    # Ensure the chat entry belongs to the current user
    if chat_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create chat entries for other users"
        )
    
    # Check if the chat exists and belongs to the user
    chat = db.query(Chat).filter(Chat.id == chat_data.chat_id).first()
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot add messages to chats of other users"
        )
    
    # Create a new chat history entry with all fields including the optional image
    db_chat = ChatHistory(**chat_data.model_dump())
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    
    # Update the chat's updated_at timestamp
    chat.updated_at = db_chat.created_at
    db.commit()
    
    return db_chat

@router.get("/chat", response_model=List[ChatHistoryResponse])
def get_chat_history(
    current_user: Annotated[UserModel, Depends(get_current_active_user)],
    chat_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Create base query for the current user
    query = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id)
    
    # Filter by chat_id if provided
    if chat_id is not None:
        # Check if the chat exists and belongs to the user
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat not found"
            )
        
        if chat.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access chats of other users"
            )
        
        query = query.filter(ChatHistory.chat_id == chat_id)
    
    # Execute query with pagination
    chat_history = (
        query.order_by(ChatHistory.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return chat_history

@router.get("/chat/{chat_entry_id}", response_model=ChatHistoryResponse)
def get_chat_entry(
    chat_entry_id: int,
    current_user: Annotated[UserModel, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    chat_entry = db.query(ChatHistory).filter(ChatHistory.id == chat_entry_id).first()
    
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