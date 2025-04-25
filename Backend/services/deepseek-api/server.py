import os
import json
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
from threading import Thread

# Configure model and device
MODEL_ID = os.getenv("MODEL_ID", "deepseek-ai/DeepSeek-R1-Distill-Llama-70B")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "4096"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.1"))

app = FastAPI(title="DeepSeek Local API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and tokenizer
print(f"Loading model {MODEL_ID} on {DEVICE}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
    low_cpu_mem_usage=True,
    device_map=DEVICE
)
print(f"Model loaded successfully!")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: List[Message]
    stream: bool = True
    max_tokens: int = MAX_LENGTH
    temperature: float = TEMPERATURE

def format_chat_messages(messages: List[Message]) -> str:
    """Format messages in the chat format that DeepSeek expects"""
    # Check for system message
    system_content = None
    for message in messages:
        if message.role == "system":
            system_content = message.content
            break
    
    # If no system message found, use default from api.py
    if not system_content:
        system_content = "Ты бизнез-консультант. Твоя цель - помощь в построении BPMN диаграммы по информации от пользователя."
    
    # Format according to deepseek-llm-7b-chat requirements
    formatted_prompt = f"<|im_start|>system\n{system_content}<|im_end|>\n"
    
    # Add the rest of the messages
    for message in messages:
        if message.role == "system":
            continue  # We've already added the system message
        elif message.role == "user":
            formatted_prompt += f"<|im_start|>user\n{message.content}<|im_end|>\n"
        elif message.role == "assistant":
            formatted_prompt += f"<|im_start|>assistant\n{message.content}<|im_end|>\n"
    
    # Add assistant prefix for the response
    formatted_prompt += "<|im_start|>assistant\n"
    
    return formatted_prompt

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    try:
        # Log the incoming request for debugging
        print("\n===== RECEIVED REQUEST =====")
        print(f"Model: {request.model}")
        print(f"Messages: {json.dumps([m.dict() for m in request.messages], ensure_ascii=False)[:200]}...")
        print(f"Stream: {request.stream}")
        print(f"Max tokens: {request.max_tokens}")
        print(f"Temperature: {request.temperature}")
        print("===========================\n")
        
        # Format the prompt for DeepSeek
        formatted_prompt = format_chat_messages(request.messages)
        
        # Tokenize the input
        input_ids = tokenizer(formatted_prompt, return_tensors="pt").input_ids.to(DEVICE)
        
        # Generate text - non-streaming response only
        with torch.no_grad():
            generation_output = model.generate(
                input_ids=input_ids,
                max_new_tokens=request.max_tokens,
                temperature=request.temperature,
                do_sample=request.temperature > 0,
                pad_token_id=tokenizer.eos_token_id
            )
        
        generated_text = tokenizer.decode(generation_output[0][input_ids.shape[1]:], skip_special_tokens=True)
        
        # Print the response for debugging
        print("\n===== GENERATED RESPONSE =====")
        print(f"First 200 chars: {generated_text[:200]}...")
        print(f"Total length: {len(generated_text)}")
        print("===========================\n")
        
        # Even if client requested streaming, return complete response
        response_data = {
            "id": "chatcmpl-" + os.urandom(4).hex(),
            "object": "chat.completion",
            "created": int(import_time()),
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": generated_text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": input_ids.shape[1],
                "completion_tokens": len(generation_output[0]) - input_ids.shape[1],
                "total_tokens": len(generation_output[0])
            }
        }
        
        if request.stream:
            # Format response to match Chutes API streaming structure
            return StreamingResponse(
                stream_complete_response(response_data),
                media_type="text/event-stream"
            )
        else:
            # Format to match Chutes API non-streaming structure
            print("\n===== SENDING RESPONSE =====")
            print(f"Structure: {json.dumps(response_data, ensure_ascii=False)[:100]}...")
            print("===========================\n")
            return response_data

    except Exception as e:
        print(f"Error in generation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def stream_complete_response(response_data):
    """Return complete response in a streaming-compatible format"""
    # Log the streaming response structure
    print("\n===== STREAMING RESPONSE FORMAT =====")
    print("Sending full content in a single stream chunk")
    
    # First send the complete content in one message to match Chutes API format
    content = response_data["choices"][0]["message"]["content"]
    data = {
        "choices": [
            {
                "delta": {
                    "content": content
                },
                "index": 0
            }
        ]
    }
    print(f"Data structure: {json.dumps(data, ensure_ascii=False)[:100]}...")
    print("===========================\n")
    
    yield f"data: {json.dumps(data)}\n\n"
    
    # Then send the [DONE] marker
    yield "data: [DONE]\n\n"

def import_time():
    """Get current time in seconds since epoch"""
    import time
    return time.time()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "1111"))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"\n===== STARTING SERVER =====")
    print(f"Model: {MODEL_ID}")
    print(f"Device: {DEVICE}")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"===========================\n")
    uvicorn.run(app, host=host, port=port)
