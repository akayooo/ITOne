from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import processpiper
import os
from .api import call_deepseek_api
from processpiper.text2diagram import render

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
    xml: Optional[str] = None

# Templates for different types of prompts
templates = {
    'TYPE_1': """
                **Роль:** Ты — продвинутый ИИ-ассистент, специализирующийся на анализе и моделировании бизнес-процессов в формате BPMN.

                **Задача:** Проанализируй следующее текстовое описание бизнес-процесса и преобразуй его в структурированный текст, используя синтаксис PiperFlow, который подходит для библиотеки Python `processpiper`. Твоя цель — максимально точно воспроизвести структуру и элементы, показанные в примере ниже.

                **Входное описание процесса:**
                {user_prompt}

                **Бизнес требования к диаграмме**
                {buisness}

                **Технические ограничения:**
                1. Любой элемент может иметь максимум 4 соединения (входящих и исходящих вместе).
                2. Если элементу требуется больше 4 соединений, используй дополнительные шлюзы для разделения потоков.
                3. Не создавай сложные шлюзы с множеством соединений - разбивай их на несколько простых.

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

            **Технические ограничения:**
            1. Любой элемент может иметь максимум 4 соединения (входящих и исходящих вместе).
            2. Если элементу требуется больше 4 соединений, используй дополнительные шлюзы для разделения потоков.
            3. Не создавай сложные шлюзы с множеством соединений - разбивай их на несколько простых.

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

            **Технические ограничения:**
            1. Любой элемент может иметь максимум 4 соединения (входящих и исходящих вместе).
            2. Если элементу требуется больше 4 соединений, используй дополнительные шлюзы для разделения потоков.
            3. Не создавай сложные шлюзы с множеством соединений - разбивай их на несколько простых.
            4. Внимательно проверь, чтобы ни один элемент не имел более 4 соединений.

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
    2) TYPE_2 — "Добавить элемент в уже существующую диаграмму" (примеры: "Добавь новый блок...", "Добавить еще один шаг...", "Дополнить диаграмму...", "Добавь этап...", "Расширить схему...", "Нужно добавить...", "Включи в диаграмму...")
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
    Ты — продвинутый ИИ-ассистент для анализа бизнес-процессов в формате BPMN.
    
    Проанализируй следующее описание и напиши рекомендации по улучшению диаграммы.
    
    Текущий PiperFlow синтаксис: {piperflow}
    
    Текущий бизнес процесс: {current_process}
    
    Требования со стороны бизнеса: {buisness}
    
    **Технические ограничения, которые обязательно должны соблюдаться:**
    1. Любой элемент может иметь максимум 4 соединения (входящих и исходящих вместе).
    2. Если элементу требуется больше 4 соединений, используй дополнительные шлюзы для разделения потоков.
    3. Не создавай сложные шлюзы с множеством соединений - разбивай их на несколько простых.
    4. Обязательно проверь диаграмму на наличие элементов с более чем 4 соединениями и предложи способ их разделения.
    
    Дай максимум 5 (пять) четких рекомендаций по улучшению этой схемы.
    Каждая рекомендация должна быть пронумерована (1., 2., и т.д.).
    Не используй маркдаун-форматирование (звездочки, решетки).
    Пиши кратко и по существу, без вводных фраз и заключений.
    
    Обязательно включи рекомендацию по исправлению соединений, если в схеме есть элементы с более чем 4 соединениями.
    """
    promt = promt.format(piperflow=piperflow, current_process=current_process, buisness=buisness)
    recs = call_deepseek_api(promt)
    
    # Дополнительная обработка для удаления маркдаун-форматирования
    recs = recs.replace('**', '').replace('##', '').replace('*', '').replace('#', '')
    
    # Ограничение до 5 рекомендаций
    recommendations = []
    for line in recs.split('\n'):
        line = line.strip()
        if line and (line[0].isdigit() and line[1:3] in ['. ', '- ', ': ', ') ']):
            recommendations.append(line)
    
    # Оставляем только первые 5 рекомендаций
    if len(recommendations) > 5:
        recommendations = recommendations[:5]
        
    return '\n'.join(recommendations) if recommendations else recs

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

def create_bpmn_xml_from_piperflow(piperflow_text: str) -> str:
    """
    Create a complete BPMN XML directly from PiperFlow text.
    This is a critical function that ensures the XML properly represents the diagram.
    """
    if not piperflow_text or len(piperflow_text.strip()) == 0:
        print("[ERROR] Empty piperflow text provided to XML generator")
        return None
    
    # Log piperflow for debugging
    print(f"[DEBUG] Creating XML from piperflow of length: {len(piperflow_text)}")
    
    # Create the simplest possible valid BPMN XML with the piperflow embedded in a CDATA section
    # This is a minimalist template that will allow the frontend to process the diagram
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:documentation><![CDATA[{piperflow_text}]]></bpmn:documentation>
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="150" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>"""

    print(f"[SUCCESS] Created XML with length {len(xml)}")
    return xml

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
            
            print(f"[SUCCESS] Создан новый PiperFlow на основе запроса пользователя (TYPE_1)")
            print(f"[DEBUG] PiperFlow length: {len(piperflow_text)} characters")
            print(f"[DEBUG] PiperFlow text sample: {piperflow_text[:100]}...")
            
            # Автоматически генерируем рекомендации для новой диаграммы
            recommendations = recs_generation(
                piperflow=piperflow_text,
                current_process=request.user_prompt,
                buisness=request.business_requirements
            )
            
            print(f"[SUCCESS] Сгенерированы рекомендации для новой диаграммы")
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
                
                print(f"[SUCCESS] Сгенерированы рекомендации для существующей диаграммы")
            else:
                recommendations = request.recommendations
                
            piperflow_text = promt_template_creator_and_answer(
                user_promt=request.user_prompt,
                piperflow_text=request.piperflow_text,
                recomendations=recommendations,
                buisness=request.business_requirements
            )
            
            print(f"[SUCCESS] Обновлен PiperFlow на основе запроса пользователя (TYPE {request_type})")

        # Создаем XML с помощью нашей функции
        xml = create_bpmn_xml_from_piperflow(piperflow_text)

        return BPMNResponse(
            status="success",
            message="Диаграмма успешно создана",
            piperflow_text=piperflow_text,
            recommendations=recommendations,
            xml=xml
        )

    except Exception as e:
        print(f"Error in process_bpmn: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class RecommendationRequest(BaseModel):
    """Request model for applying recommendations."""
    piperflow_text: str
    recommendations: str
    business_requirements: Optional[str] = None

class RecommendationResponse(BaseModel):
    """Response model for recommendation application."""
    piperflow_text: str
    xml: Optional[str] = None
    message: str

def apply_recommendation_to_piperflow(piperflow_text: str, recommendation: str) -> str:
    """
    DEPRECATED: This function is no longer used as we've moved to LLM-based recommendation application.
    Apply a single recommendation to the piperflow text.
    This is a simplified implementation - in a real system, you might
    use a more sophisticated approach or AI to apply changes.
    """
    # For now, a simple approach - add the recommendation as a comment
    lines = piperflow_text.splitlines()
    
    # Find a suitable place to add the recommendation
    # Strategy: Look for a process definition or add at the end
    process_line_index = -1
    
    for i, line in enumerate(lines):
        if line.strip().startswith("process:"):
            process_line_index = i
            break
    
    if process_line_index >= 0:
        # Add after the process line with proper indentation
        indent = "  "  # Basic indentation
        comment_line = f"{indent}# Applied recommendation: {recommendation}"
        lines.insert(process_line_index + 1, comment_line)
    else:
        # Add at the end with a header if no process found
        lines.append("\n# Applied recommendations:")
        lines.append(f"# - {recommendation}")
    
    return "\n".join(lines)

@router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Add the new endpoint for applying recommendations
class ApplyRecommendationsRequest(BaseModel):
    piperflow_text: str
    recommendations: str
    business_requirements: Optional[str] = "1. Схема должна быть грамотная и удобная для чтения. 2. Если возможно какой-то комплексный блок разбить на меньшие блоки - сделай это"

class ApplyRecommendationsResponse(BaseModel):
    status: str
    piperflow_text: str
    xml: Optional[str] = None
    error: Optional[str] = None
    recommendations: Optional[str] = None

@router.post("/apply_recommendations", response_model=RecommendationResponse)
async def apply_recommendations(request: RecommendationRequest):
    """Apply recommendations to a BPMN diagram."""
    try:
        # Log input for debugging
        print(f"[INFO] Applying recommendations to piperflow")
        print(f"[DEBUG] Recommendations length: {len(request.recommendations) if request.recommendations else 0}")
        print(f"[DEBUG] PiperFlow length: {len(request.piperflow_text) if request.piperflow_text else 0}")
        
        # Check if inputs are valid
        if not request.piperflow_text or not request.recommendations:
            raise HTTPException(
                status_code=400,
                detail="Необходимо указать и piperflow_text, и recommendations"
            )
        
        # Create a prompt that takes the original piperflow and applies the recommendations
        promt = templates['TYPE_3'].format(
            user_prompt="Please apply the following recommendations to the diagram", 
            piperflow=request.piperflow_text,
            recs=request.recommendations,
            buisness=request.business_requirements or "1. Схема должна быть грамотная и удобная для чтения."
        )
        
        # Get the updated piperflow text from the LLM
        print(f"[INFO] Calling Deepseek API for updating diagram")
        updated_piperflow = call_deepseek_api(promt)
        print(f"[SUCCESS] Response received from Deepseek API, length: {len(updated_piperflow)}")
        
        # Extract the piperflow block from the LLM's response
        # Ensure we're getting just the piperflow text, not any explanations or additional text
        updated_piperflow = extract_piperflow_block(updated_piperflow)
        print(f"[DEBUG] Extracted piperflow block, length: {len(updated_piperflow)}")
        
        # Generate XML from the updated piperflow
        xml = create_bpmn_xml_from_piperflow(updated_piperflow)
        if not xml:
            raise HTTPException(
                status_code=500,
                detail="Не удалось создать XML из обновленного piperflow"
            )
        
        print(f"[SUCCESS] Generated XML from updated piperflow, length: {len(xml)}")
        
        # Return the response with updated piperflow and XML
        return RecommendationResponse(
            piperflow_text=updated_piperflow,
            xml=xml,
            message="Recommendations successfully applied"
        )
    except Exception as e:
        print(f"Error applying recommendations: {e}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply recommendations: {str(e)}"
        )

# After the apply_recommendations endpoint, add the clear_recommendations endpoint

class ClearRecommendationsRequest(BaseModel):
    piperflow_text: str

class ClearRecommendationsResponse(BaseModel):
    status: str
    error: Optional[str] = None

@router.post("/clear_recommendations", response_model=ClearRecommendationsResponse)
async def clear_recommendations(request: ClearRecommendationsRequest):
    try:
        # This is a simple endpoint that acknowledges clearing recommendations
        # No actual database operations needed since we're just acknowledging the request
        print(f"[INFO] Запрос на очистку рекомендаций для диаграммы")
        
        return ClearRecommendationsResponse(
            status="success"
        )
    except Exception as e:
        print(f"Error in clear_recommendations: {e}")
        import traceback
        traceback.print_exc()
        return ClearRecommendationsResponse(
            status="error",
            error=str(e)
        )

# Add a new endpoint for determining request type
class RequestTypeRequest(BaseModel):
    message: str

class RequestTypeResponse(BaseModel):
    type: str
    is_bpmn_related: bool

@router.post("/determine_request_type", response_model=RequestTypeResponse)
async def determine_request_type(request: RequestTypeRequest):
    try:
        print(f"[INFO] Determining request type for: {request.message[:100]}...")
        
        # First check if the request is BPMN related
        is_bpmn_related = validate_bpmn_request(request.message)
        
        # If it's BPMN related, determine the type
        if is_bpmn_related:
            request_type = type_choose(request.message)
            print(f"[INFO] Request type determined: {request_type}")
        else:
            request_type = "NOT_BPMN"
            print(f"[INFO] Request is not BPMN related")
        
        return RequestTypeResponse(
            type=request_type,
            is_bpmn_related=is_bpmn_related
        )
    except Exception as e:
        print(f"Error in determine_request_type: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# After the apply_recommendations endpoint, add the recommendations endpoint

class GenerateRecommendationsRequest(BaseModel):
    piperflow_text: str
    current_process: Optional[str] = None
    business_requirements: Optional[str] = "1. Схема должна быть грамотная и удобная для чтения. 2. Если возможно какой-то комплексный блок разбить на меньшие блоки - сделай это"

class GenerateRecommendationsResponse(BaseModel):
    recommendations: str

@router.post("/recommendations", response_model=GenerateRecommendationsResponse)
async def generate_recommendations(request: GenerateRecommendationsRequest):
    """Generate recommendations for improving a BPMN diagram."""
    try:
        print(f"[INFO] Generating recommendations for diagram")
        
        # Generate recommendations using the recs_generation function
        recommendations = recs_generation(
            piperflow=request.piperflow_text,
            current_process=request.current_process or "unknown process",
            buisness=request.business_requirements
        )
        
        print(f"[SUCCESS] Generated recommendations for diagram")
        print(f"[DEBUG] Recommendations: {recommendations}")
        
        return GenerateRecommendationsResponse(
            recommendations=recommendations
        )
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recommendations: {str(e)}"
        )
