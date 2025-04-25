import os
import json
import requests
from typing import Optional, Union

def call_deepseek_api(prompt: str) -> str:
    """
    Calls the DeepSeek API through Chutes API with the given prompt
    """
    # Check API mode from environment variable (1 = external API, 2 = local model)
    api_mode = int(os.getenv("API_MODE", "1"))
    
    print(f"\n===== USING API MODE: {api_mode} =====")
    print(f"Prompt (first 100 chars): {prompt[:100]}...")
    
    if api_mode == 2:
        # Use local model
        local_api_endpoint = os.getenv("LOCAL_API_URL", "http://localhost:1111/v1/chat/completions")
        system_prompt = "Ты бизнез-консультант. Твоя цель - помощь в построении BPMN диаграммы по информации от пользователя."
        
        headers = {
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        data = {
            'model': "deepseek-ai/deepseek-llm-7b-chat",
            'messages': messages,
            'stream': True,
            'max_tokens': 4096,
            'temperature': 0.1
        }
        
        print("\n===== LOCAL MODEL REQUEST =====")
        print(f"Endpoint: {local_api_endpoint}")
        print(f"Headers: {headers}")
        print(f"Data: {json.dumps(data, ensure_ascii=False)[:200]}...")
        print("===========================\n")
        
        try:
            print("Using local DeepSeek model...")
            print(f"Connecting to local endpoint: {local_api_endpoint}")
            full_response = ""
            
            try:
                print("Sending request to local model...")
                response = requests.post(local_api_endpoint, headers=headers, json=data, stream=True)
                print(f"Response status code: {response.status_code}")
                response.raise_for_status()
                
                print("Starting to process streaming response...")
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
                    print("\n===== LOCAL MODEL RESPONSE =====")
                    print(f"Response (first 200 chars): {full_response[:200]}...")
                    print(f"Total length: {len(full_response)}")
                    print("===========================\n")
                    return full_response.strip()
                else:
                    print("Error: Local API returned empty response.")
                    raise Exception("Empty response from local API")
                
            except requests.exceptions.ConnectionError as e:
                print(f"Connection error to local model: {e}")
                print("Check if the local model server is running on the correct port.")
                raise
            except requests.exceptions.Timeout as e:
                print(f"Timeout error with local model: {e}")
                print("The request to the local model timed out. The model might be loading or processing slowly.")
                raise
            except requests.exceptions.HTTPError as e:
                print(f"HTTP error from local model: {e}")
                raise
            except Exception as e:
                print(f"Unexpected error with local model: {e}")
                import traceback
                traceback.print_exc()
                raise
                
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error to local model: {e}")
            print("Check if the local model server is running on the correct port.")
            raise
        except requests.exceptions.Timeout as e:
            print(f"Timeout error with local model: {e}")
            print("The request to the local model timed out. The model might be loading or processing slowly.")
            raise
        except requests.exceptions.HTTPError as e:
            print(f"HTTP error from local model: {e}")
            raise
        except Exception as e:
            print(f"Unexpected error with local model: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    else:  # api_mode == 1 or any other value (default to external API)
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

        print("\n===== EXTERNAL API REQUEST =====")
        print(f"Endpoint: {api_endpoint}")
        print(f"Headers: {headers}")
        print(f"Data: {json.dumps(data, ensure_ascii=False)[:200]}...")
        print("===========================\n")

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
                print("\n===== EXTERNAL API RESPONSE =====")
                print(f"Response (first 200 chars): {full_response[:200]}...")
                print(f"Total length: {len(full_response)}")
                print("===========================\n")
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