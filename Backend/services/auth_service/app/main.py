from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, chat
from app.database import Base, engine

# Create the database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(title="Auth Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, tags=["authentication"])
app.include_router(chat.router, tags=["chat"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Auth Service API"}

@app.get("/protected")
async def protected_route(current_user = Depends(auth.get_current_active_user)):
    return {"message": "This is a protected route", "user": current_user.username}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 