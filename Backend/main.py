import fastapi
from fastapi.middleware.cors import CORSMiddleware
from services.auth_service.app.api import auth, chat
from services.auth_service.app.database import Base, engine
from services.bpmn_creator_service.router import router as bpmn_router

# Create the database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app without OpenAPI to avoid Pydantic schema errors
app = fastapi.FastAPI(
    title="BPMN API",
    description="AI-powered BPMN chat + editor",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers directly
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(bpmn_router, prefix="/api/bpmn", tags=["bpmn"])

@app.get("/")
async def root():
    return {"Visit /docs for API documentation."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)