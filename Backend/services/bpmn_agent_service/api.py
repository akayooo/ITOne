import os
import json
import requests
from typing import Optional, Union

def call_deepseek_api(prompt: str) -> str:
    """
    Calls the DeepSeek API through Chutes API with the given prompt
    """
    api_key = os.getenv("CHUTES_API_KEY", "cpk_b9f646794b554414935934ec5a3513de.f78245306f06593ea49ef7bce2228c8e.kHJVJjyK8dtqB0oD2Ofv4AaME6MSnKDy")
    api_endpoint = os.getenv("CHUTES_API_URL", "https://llm.chutes.ai/v1/chat/completions")
    model_id = os.getenv("MODEL_ID", "deepseek-ai/DeepSeek-V3-0324")
    
    system_prompt = "Ты бизнез-консультант. Твоя цель - помощь в построении BPMN диаграммы по информации от пользователя."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    data = {
        'model': model_id,
        'messages': messages,
        'stream': True,
        'max_tokens': 4096,
        'temperature': 0.1
    }

    try:
        print(f"Sending request to {model_id}...")
        full_response = ""
        response = requests.post(api_endpoint, headers=headers, json=data, stream=True)
        response.raise_for_status()
        
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
                    print(f"Error processing response: {str(e)}")
                    continue
        
        if full_response:
            print("Response received.")
            return full_response.strip()
        else:
            print("Error: API returned empty response.")
            raise Exception("Empty response from API")

    except requests.exceptions.ConnectionError as e:
        print(f"Connection error: {e}")
        raise
    except requests.exceptions.Timeout as e:
        print(f"Timeout error: {e}")
        raise
    except requests.exceptions.HTTPError as e:
        print(f"HTTP error: {e}")
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise 