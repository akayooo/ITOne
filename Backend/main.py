import fastapi
from services.auth_service.app.main import auth_router


app = fastapi.FastAPI()

app.add_api_route("/auth", auth_router)


@app.get("/")
async def root():
    return {"message": "Hello World"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)