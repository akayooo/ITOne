from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import processpiper
import os
from .api import call_deepseek_api

router = APIRouter()

class BPMNRequest(BaseModel):
    user_prompt: str
    piperflow_text: Optional[str] = None
    recommendations: Optional[str] = None
    business_requirements: Optional[str] = "1. Схема должна быть грамотная и удобная для чтения. 2. Если возможно какой-то комплексный блок разбить на меньшие блоки - сделай это"

class BPMNResponse(BaseModel):
    status: str
    message: str
    piperflow_text: Optional[str] = None
    error: Optional[str] = None
    recommendations: Optional[str] = None

# Templates for different types of prompts
templates = {
    'TYPE_1': """
                **Роль:** Ты — продвинутый ИИ-ассистент, специализирующийся на анализе и моделировании бизнес-процессов в формате BPMN.

                **Задача:** Проанализируй следующее текстовое описание бизнес-процесса и преобразуй его в структурированный текст, используя синтаксис PiperFlow, который подходит для библиотеки Python `processpiper`. Твоя цель — максимально точно воспроизвести структуру и элементы, показанные в примере ниже.

                **Входное описание процесса:**
                {user_prompt}

                **Бизнес требования к диаграмме**
                {buisness}

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
                """,
    "TYPE_2": """
            **Роль:** Ты — продвинутый ИИ-ассистент, специализирующийся на анализе и моделировании бизнес-процессов в формате BPMN.

            **Задача:** Проанализируй следующее текстовое описание и добавь новые элементы диаграммы, используя синтаксис PiperFlow, который подходит для библиотеки Python `processpiper`. Твоя цель — не исправлять имеющуюся диаграмму, а добавить нужный элемент.

            **Входное описание процесса:**
            Запрос пользователя: {user_prompt}
            Ранее задействованный PiperFlow синтаксис: {piperflow}

            **Бизнес требования к диаграмме**
                {buisness}

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
            """,

    'TYPE_3':"""
            **Роль:** Ты — продвинутый ИИ-ассистент, специализирующийся на анализе и моделировании бизнес-процессов в формате BPMN.

            **Задача:** Проанализируй следующее текстовое описание и отредактируй ее по правкам, используя синтаксис PiperFlow, который подходит для библиотеки Python `processpiper`. Твоя цель — создать лучшую диаграмму на основе правок.

            **Входное описание процесса:**
            Запрос пользователя: {user_prompt}
            Ранее задействованный PiperFlow синтаксис: {piperflow}
            Рекомендации : {recs}

            **Бизнес требования к диаграмме**
                {buisness}

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
}

def type_choose(input_text: str) -> str:
    """Определяет тип запроса"""
    router_template = """
    Вам нужно классифицировать пользовательский запрос по одному из трёх типов:
    1) TYPE_1 — "Создать диаграмму с нуля по описанию"
    2) TYPE_2 — "Добавить элемент в уже существующую диаграмму"
    3) TYPE_3 — "Редактировать диаграмму по набору рекомендаций или новым правкам от пользователя"

    Отвечайте строго одним кодовым словом: TYPE_1, TYPE_2 или TYPE_3.

    Вопрос: {input}  
    Ответ:"""

    final_prompt = router_template.format(input=input_text)
    response = call_deepseek_api(final_prompt)
    return response

def validate_bpmn_request(prompt: str) -> bool:
    """Проверяет, относится ли запрос к BPMN"""
    validation_prompt = """
    Определите, относится ли запрос к моделированию бизнес-процессов, BPMN диаграммам или библиотеке processpiper.
    Ответьте строго YES или NO.
    
    Запрос: {prompt}
    Ответ:"""
    
    final_prompt = validation_prompt.format(prompt=prompt)
    response = call_deepseek_api(final_prompt)
    return response.strip().upper() == "YES"

def extract_piperflow_block(text: str) -> str:
    """
    Ищет в тексте блок, начинающийся с 'title:' и заканчивающийся на 'colourtheme:',
    включая тему (например, 'colourtheme: BLUEMOUNTAIN').
    Возвращает найденный блок или пустую строку, если не найдено.
    """
    text = text.replace('\"', '')
    pattern = """{text}
    """
    final_text = pattern.format(text=text)
    return final_text

def recs_generation(piperflow: str, current_process: str, buisness: str) -> str:
    """
    Генерирует рекомендации по улучшению диаграмм с точки зрения бизнеса
    """
    promt = """
    **Роль:** 
    Ты — продвинутый ИИ-ассистент, специализирующийся на анализе и моделировании бизнес-процессов в формате BPMN.

    **Задача:** Проанализируй следующее текстовое описание и отредактируй ее по правкам, используя синтаксис PiperFlow, который подходит для библиотеки Python `processpiper`. Твоя цель — написать рекомендации по улучшению диаграммы с точки зрения бизнеса, не пиши код Piperflow

    **Входное описание процесса:**
    Текущий PiperFlow синтаксис: {piperflow}

    **Описание бизнес-процесса**
    Текущий бизнесс процесс: {current_process}

    **Бизнес требования**
    Требования со стороны бизнеса: {buisness}

    Улучши эту схему, основываясь на бизнес тробованиях.
    """
    promt = promt.format(piperflow=piperflow, current_process=current_process, buisness=buisness)
    recs = call_deepseek_api(promt)

    return recs

def promt_template_creator_and_answer(user_promt: str, buisness: str, recomendations: str = None, piperflow_text: str = None) -> str:
    """
    Функция отдает промт по типу запроса
    """
    if piperflow_text is None:
        promt = templates['TYPE_1'].format(user_prompt=user_promt, buisness=buisness)
    else:
        promt_type = type_choose(user_promt)
        if promt_type == 'TYPE_1':
            promt = templates['TYPE_1'].format(user_prompt=user_promt, buisness=buisness)
        elif promt_type == 'TYPE_2':
            promt = templates['TYPE_2'].format(user_prompt=user_promt, piperflow=piperflow_text, buisness=buisness)
        else:
            promt = templates['TYPE_3'].format(user_prompt=user_promt, piperflow=piperflow_text, recs=recomendations, buisness=buisness)
    
    answer = call_deepseek_api(promt)
    return answer

@router.post("/process_bpmn", response_model=BPMNResponse)
async def process_bpmn(request: BPMNRequest):
    # Validate if request is BPMN-related
    if not validate_bpmn_request(request.user_prompt):
        raise HTTPException(
            status_code=400,
            detail="Ваш запрос не относится к моей специализации. Пожалуйста, задайте вопрос, касающийся моделирования бизнес-процессов, BPMN диаграмм или библиотеки processpiper."
        )

    try:
        # Process the request based on type
        request_type = type_choose(request.user_prompt)
        
        # Generate PiperFlow text based on request type
        if request_type == "TYPE_1":
            piperflow_text = promt_template_creator_and_answer(
                user_promt=request.user_prompt,
                buisness=request.business_requirements
            )
            
            # Автоматически генерируем рекомендации для новой диаграммы
            recommendations = recs_generation(
                piperflow=piperflow_text,
                current_process=request.user_prompt,
                buisness=request.business_requirements
            )
        else:
            if not request.piperflow_text:
                raise HTTPException(
                    status_code=400,
                    detail="Для модификации существующей диаграммы требуется piperflow_text"
                )
            
            # Если рекомендации не предоставлены, генерируем их автоматически
            if not request.recommendations:
                recommendations = recs_generation(
                    piperflow=request.piperflow_text,
                    current_process=request.user_prompt,
                    buisness=request.business_requirements
                )
            else:
                recommendations = request.recommendations
                
            piperflow_text = promt_template_creator_and_answer(
                user_promt=request.user_prompt,
                piperflow_text=request.piperflow_text,
                recomendations=recommendations,
                buisness=request.business_requirements
            )

        return BPMNResponse(
            status="success",
            message="Диаграмма успешно создана",
            piperflow_text=piperflow_text,
            recommendations=recommendations
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RecommendationRequest(BaseModel):
    piperflow_text: str
    current_process: str
    business_requirements: Optional[str] = "1. Схема должна быть грамотная и удобная для чтения. 2. Если возможно какой-то комплексный блок разбить на меньшие блоки - сделай это"

class RecommendationResponse(BaseModel):
    status: str
    recommendations: str
    error: Optional[str] = None

@router.post("/recommendations", response_model=RecommendationResponse)
async def generate_recommendations(request: RecommendationRequest):
    try:
        recommendations = recs_generation(
            piperflow=request.piperflow_text,
            current_process=request.current_process,
            buisness=request.business_requirements
        )
        
        return RecommendationResponse(
            status="success",
            recommendations=recommendations
        )
    except Exception as e:
        return RecommendationResponse(
            status="error",
            recommendations="",
            error=str(e)
        )

@router.get("/health")
async def health_check():
    return {"status": "healthy"}
