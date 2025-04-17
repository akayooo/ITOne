from fastapi import APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware

from services.auth_service.app.api import auth, chat
from services.auth_service.app.database import Base, engine

# Create the database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
auth_router = APIRouter()

# Include routers
auth_router.include_router(auth.router, tags=["authentication"])
auth_router.include_router(chat.router, tags=["chat"])

@auth_router.get("/protected")
async def protected_route(current_user = Depends(auth.get_current_active_user)):
    return {"message": "This is a protected route", "user": current_user.username}