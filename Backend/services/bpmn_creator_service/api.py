import os
import json
import requests
from typing import Union, Tuple, List, Optional 
import logging

# Configure logging
logging = logging.getLogger(__name__)

# --- Конфигурация ---
CHUTES_API_URL = "https://llm.chutes.ai/v1/chat/completions"
my_api_key = 'cpk_b9f646794b554414935934ec5a3513de.f78245306f06593ea49ef7bce2228c8e.kHJVJjyK8dtqB0oD2Ofv4AaME6MSnKDy'

def call_deepseek_api(
    prompt: str,
    api_key: str = my_api_key,
    model_id: str = "deepseek-ai/DeepSeek-V3-0324", 
    system_prompt: str = "Ты бизнез-консультант. Твоя цель - помощь в построении BPMN диаграммы по информации от пользователя.",
    base_url: str = CHUTES_API_URL,
    max_tokens: int = 1024, 
    temperature: float = 0.7 
    ) -> Union[str, None]:
    """
    Отправляет текстовый запрос в Chutes API и возвращает ответ модели.

    Args:
        prompt: Текстовый запрос пользователя.
        api_key: Ваш API ключ. Если None, используется значение по умолчанию.
        model_id: Идентификатор модели (по умолчанию "deepseek-ai/DeepSeek-V3-0324").
        system_prompt: Системное сообщение для настройки поведения модели.
        base_url: Базовый URL для API.
        max_tokens: Максимальное количество токенов для генерации в ответе.
        temperature: Параметр креативности ответа (0.0 - 1.0+).

    Returns:
        Строку с ответом модели или None в случае ошибки.
    """
    if not api_key:
        print("Ошибка: API ключ не предоставлен.")
        return None

    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        prompt_template = """
                **Роль:** Ты — продвинутый ИИ-ассистент, специализирующийся на анализе и моделировании бизнес-процессов в формате BPMN.

                **Задача:** Проанализируй следующее текстовое описание бизнес-процесса и преобразуй его в структурированный текст, используя синтаксис PiperFlow, который подходит для библиотеки Python `processpiper`. Твоя цель — максимально точно воспроизвести структуру и элементы, показанные в примере ниже.

                **Входное описание процесса:**
                {user_prompt}

                **Требования к выходному формату (PiperFlow Syntax):**
                
                Вы — помощник по преобразованию описания бизнес‑процесса в синтаксис PiperFlow для библиотеки processpiper. Если вопрос не относится к темам: BPMN диаграмы, бизнес или библиотека processpiper ответь, что запрос не относится к твоей специализации и попроси задать вопрос касаюищейся твоей специализации.
                Когда приходит текстовое описание, выдавайте только блок кода, строго по этому шаблону, не используя двойные кавчки в ответе:
                title: <Название процесса>
                colourtheme: BLUEMOUNTAIN

                pool: <Имя первого пула>
                    lane: <Имя первой роли>
                        (start) as start_event
                        [<Действие 1>] as <идентификатор_1>
                        [<Действие 2>] as <идентификатор_2>
                        …
                        start_event -> <идентификатор_1> -> <идентификатор_2> -> …

                pool: <Имя второго пула>
                    lane: <Имя роли>
                        [<Действие 3>] as <идентификатор_3>
                        <Условие?> as <идентификатор_шлюза>  
                        [<Действие 4>] as <идентификатор_4>
                        [<Действие 5>] as <идентификатор_5>
                        (end) as end_event

                        <поток_событий_1>
                        <поток_событий_2>
                        …

                footer: <Краткое описание процесса>

                **Полный пример желаемого вывода (используй этот формат и стиль):**
                """
        
        final_prompt = prompt_template.format(user_prompt=prompt)
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": final_prompt})
        
        data = {
            'model': model_id,
            'messages': messages,
            'stream': True,
            'max_tokens': max_tokens,
            'temperature': temperature
        }
        
        print(f"Отправка запроса к модели {model_id}...")
        full_response = ""
        response = requests.post(base_url, headers=headers, json=data, stream=True)
        
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
                    print(f"Ошибка обработки ответа: {str(e)}")
                    continue
        
        if full_response:
            print("Ответ получен.")
            return full_response.strip()
        else:
            print("Ошибка: API вернуло пустой ответ.")
            return None

    except requests.exceptions.ConnectionError as e:
        print(f"Ошибка соединения с API: {e}")
        return None
    except requests.exceptions.Timeout as e:
        print(f"Ошибка: Превышено время ожидания ответа от API: {e}")
        return None
    except requests.exceptions.HTTPError as e:
        print(f"Ошибка HTTP: {e}")
        return None
    except Exception as e:
        print(f"Произошла непредвиденная ошибка: {e}")
        import traceback
        traceback.print_exc() 
        return None