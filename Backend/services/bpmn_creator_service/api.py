import os
from openai import OpenAI
from openai import APIConnectionError, RateLimitError, APIStatusError 
from typing import Union, Tuple, List, Optional 

# --- Конфигурация ---
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
my_api_key = 'sk-767f7ecb76a744eeb20517f45a97d34f'

# Используем 'deepseek-chat' (V3) [1, 3] или 'deepseek-reasoner'
def call_deepseek_api(
    prompt: str,
    api_key: str = my_api_key,
    model_id: str = "deepseek-chat", 
    system_prompt: str = "Ты бизнез-консультант. Твоя цель - помощь в построении BPMN диаграммы по информации от пользователя.",
    base_url: str = DEEPSEEK_BASE_URL,
    max_tokens: int = 1024, 
    temperature: float = 0.7 
    ) -> Union[str, None]:
    """
    Отправляет текстовый запрос в DeepSeek API и возвращает ответ модели.

    Args:
        user_prompt: Текстовый запрос пользователя.
        api_key: Ваш API ключ DeepSeek. Если None, пытается взять из переменной окружения DEEPSEEK_API_KEY.
        model_id: Идентификатор модели DeepSeek ('deepseek-chat' или 'deepseek-reasoner').
        system_prompt: Системное сообщение для настройки поведения модели.
        base_url: Базовый URL для API DeepSeek.
        max_tokens: Максимальное количество токенов для генерации в ответе.
        temperature: Параметр креативности ответа (0.0 - 1.0+).

    Returns:
        Строку с ответом модели или None в случае ошибки.
    """
    if not api_key:
        print("Ошибка: API ключ DeepSeek не предоставлен и не найден в переменной окружения DEEPSEEK_API_KEY.")
        return None

    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
        promt_template = """
                **Роль:** Ты — продвинутый ИИ-ассистент, специализирующийся на анализе и моделировании бизнес-процессов в формате BPMN.

                **Задача:** Проанализируй следующее текстовое описание бизнес-процесса и преобразуй его в структурированный текст, используя синтаксис PiperFlow, который подходит для библиотеки Python `processpiper`. Твоя цель — максимально точно воспроизвести структуру и элементы, показанные в примере ниже.

                **Входное описание процесса:**
                {user_prompt}

                **Требования к выходному формату (PiperFlow Syntax):**

                Вы — помощник по преобразованию описания бизнес‑процесса в синтаксис PiperFlow для библиотеки processpiper. 
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
        
        final_promt = promt_template.format(user_prompt=prompt)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": final_promt})

        print(f"Отправка запроса к модели {model_id}...")
        response = client.chat.completions.create(
            model=model_id,
            messages=messages,
            stream=False,
            max_tokens=max_tokens,
            temperature=temperature
        )

        if response.choices and response.choices[0].message:
            result_text = response.choices[0].message.content
            print("Ответ получен.")
            return result_text.strip()
        else:
            print("Ошибка: API вернуло неожиданный формат ответа.")
            print(f"Полный ответ: {response}")
            return None


    except APIConnectionError as e:
        print(f"Ошибка соединения с API DeepSeek: {e}")
        return None
    except RateLimitError as e:
        print(f"Ошибка: Превышен лимит запросов к API DeepSeek: {e}")
        return None
    except APIStatusError as e:
        print(f"Ошибка статуса API DeepSeek: Статус {e.status_code}, Ответ: {e.response}")
        return None
    except Exception as e:
        print(f"Произошла непредвиденная ошибка: {e}")
        import traceback
        traceback.print_exc() 
        return None