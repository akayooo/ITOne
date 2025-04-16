from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import requests
import json
import logging
from pydantic import BaseModel
from typing import Optional, List, Union
import os
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="ITOne API", description="API for LLM integration and speech-to-text conversion")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class LLMRequest(BaseModel):
    prompt: str
    model: str = "deepseek-ai/DeepSeek-V3-0324"
    max_tokens: int = 2024
    temperature: float = 0.7
    role: str = "user"

class LLMResponse(BaseModel):
    response: str
    execution_time: float

class TranscriptionResponse(BaseModel):
    text: str
    status: str = "success"

def generate_response_sync(prompt, model="deepseek-ai/DeepSeek-V3-0324", max_tokens=2024, temperature=0.7, role="user"):
    api_key = 'cpk_b9f646794b554414935934ec5a3513de.f78245306f06593ea49ef7bce2228c8e.kHJVJjyK8dtqB0oD2Ofv4AaME6MSnKDy'
    url = 'https://llm.chutes.ai/v1/chat/completions'
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'model': model,
        'messages': [
            {
                'role': role,
                'content': prompt
            }
        ],
        'stream': True,
        'max_tokens': max_tokens,
        'temperature': temperature
    }
    
    full_response = ""
    response = requests.post(url, headers=headers, json=data, stream=True)
    for line in response.iter_lines():
        if line:
            try:
                line_text = line.decode('utf-8')
                if line_text.startswith('data: '):
                    line_text = line_text[6:]
                if line_text.strip() and line_text != '[DONE]':
                    parsed = json.loads(line_text)
                    content = parsed.get('choices', [{}])[0].get('delta', {}).get('content', '')
                    if content:
                        full_response += content
            except json.JSONDecodeError:
                if line_text.strip() == '[DONE]':
                    break
                continue
            except Exception as e:
                logger.error(f"Error parsing LLM response: {str(e)}")
                continue
    
    return full_response

@app.post('/api/llm', response_model=LLMResponse, tags=["Нейросеть"])
def llm_endpoint(request: LLMRequest):
    try:
        import time
        
        start_time = time.time()
        full_response = generate_response_sync(
            prompt=request.prompt,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            role=request.role
        )
        end_time = time.time()
        execution_time = end_time - start_time
        logger.info(f"LLM request completed in {execution_time:.2f} seconds")
        return LLMResponse(
            response=full_response,
            execution_time=execution_time
        )
    except Exception as e:
        logger.error(f"Error in LLM endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing LLM request: {str(e)}")

@app.post('/api/transcribe', response_model=TranscriptionResponse, tags=["Распознавание речи"])
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
    file_path: Optional[str] = Form(None)
):
    try:
        # Validate that at least one option is provided
        if not file and not file_path:
            raise HTTPException(
                status_code=400, 
                detail="Either upload a file or provide a path to an existing file"
            )
        if file:
            file_name = file.filename
            logger.info(f"Processing uploaded file: {file_name}")
            return TranscriptionResponse(
                text=f"Stub transcription for uploaded file: {file_name}"
            )
        else:
            logger.info(f"Processing file at path: {file_path}")
            # Validate that the file exists
            path = Path(file_path)
            if not path.exists():
                raise HTTPException(status_code=404, detail=f"File not found at path: {file_path}")
                
            return TranscriptionResponse(
                text=f"Stub transcription for file at path: {file_path}"
            )
            
    except Exception as e:
        logger.error(f"Error in transcription endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing transcription request: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 