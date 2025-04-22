from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import random
import uvicorn
from datetime import datetime

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data
MOCK_PHRASES = [
    "Добрый день, коллеги!",
    "Давайте обсудим новый проект",
    "Какие у нас планы на следующую неделю?",
    "Мне кажется, это отличная идея",
    "Нужно подготовить презентацию",
    "Как продвигается работа над задачей?",
    "Есть интересное предложение",
    "Давайте рассмотрим другие варианты",
    "Это требует дополнительного обсуждения",
    "Согласен с предыдущим оратором"
]

MOCK_SUMMARIES = [
    "Обсуждение нового проекта и планирование задач",
    "Анализ текущей ситуации и определение приоритетов",
    "Распределение ответственности и сроков выполнения",
    "Презентация идей и предложений по улучшению",
    "Подведение итогов и постановка новых целей"
]

# Store active transcriptions for summary generation
active_transcriptions = []

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Simulate receiving audio data
            data = await websocket.receive_bytes()
            
            # Generate random phrase
            phrase = random.choice(MOCK_PHRASES)
            active_transcriptions.append({
                'text': phrase,
                'timestamp': datetime.now().isoformat()
            })
            
            # Keep only last 20 transcriptions
            if len(active_transcriptions) > 20:
                active_transcriptions.pop(0)
                
            await websocket.send_text(phrase)
            await asyncio.sleep(3)  # Wait 3 seconds before next phrase
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await websocket.close()

@app.get("/api/summaries")
async def get_summaries():
    # Generate 2-3 random summaries
    num_summaries = random.randint(2, 3)
    current_summaries = random.sample(MOCK_SUMMARIES, num_summaries)
    
    return {
        "summaries": current_summaries
    }

if __name__ == "__main__":
    uvicorn.run("mock_server:app", host="0.0.0.0", port=8000, reload=True)