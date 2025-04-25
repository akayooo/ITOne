import os
import requests
from typing import Optional

def call_deepseek_api(prompt: str) -> str:
    """
    Calls the DeepSeek API with the given prompt
    """
    # TODO: Replace with actual API endpoint and key
    api_endpoint = os.getenv("DEEPSEEK_API_ENDPOINT", "https://api.deepseek.com/v1")
    api_key = os.getenv("DEEPSEEK_API_KEY", "your-api-key")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "deepseek-ai/DeepSeek-V3-0324",
        "prompt": prompt,
        "temperature": 0.1,
        "max_tokens": 4096
    }

    try:
        response = requests.post(f"{api_endpoint}/completions", headers=headers, json=data)
        response.raise_for_status()
        return response.json()["choices"][0]["text"].strip()
    except Exception as e:
        print(f"Error calling DeepSeek API: {str(e)}")
        raise 