from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import processpiper
from processpiper.text2diagram import render
import os

app = FastAPI(title="BPMN Agent Service")

# Pydantic models
class BPMNRequest(BaseModel):
    user_prompt: str
    piperflow_text: Optional[str] = None
    recommendations: Optional[str] = None
    business_requirements: Optional[str] = "1. Схема должна быть грамотная и удобная для чтения. 2. Если возможно какой-то комплексный блок разбить на меньшие блоки - сделай это"

class BPMNResponse(BaseModel):
    status: str
    message: str
    piperflow_text: Optional[str] = None
    diagram_path: Optional[str] = None
    error: Optional[str] = None

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
    # TODO: Implement call_deepseek_api
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
    # TODO: Implement call_deepseek_api
    response = call_deepseek_api(final_prompt)
    return response.strip().upper() == "YES"

def create_diagram(piperflow_text: str) -> tuple[str, str]:
    """Создает диаграмму из PiperFlow текста"""
    output_dir = "diagrams"
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, "process_diagram.png")
    try:
        render(piperflow_text, output_file)
        return "success", output_file
    except Exception as e:
        return "error", str(e)

@app.post("/process_bpmn", response_model=BPMNResponse)
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
            piperflow_text = promt_teplate_creator_and_answer(
                user_promt=request.user_prompt,
                buisness=request.business_requirements
            )
        else:
            if not request.piperflow_text:
                raise HTTPException(
                    status_code=400,
                    detail="Для модификации существующей диаграммы требуется piperflow_text"
                )
            piperflow_text = promt_teplate_creator_and_answer(
                user_promt=request.user_prompt,
                piperflow_text=request.piperflow_text,
                recomendations=request.recommendations,
                buisness=request.business_requirements
            )

        # Create diagram
        status, result = create_diagram(piperflow_text)
        
        if status == "success":
            return BPMNResponse(
                status="success",
                message="Диаграмма успешно создана",
                piperflow_text=piperflow_text,
                diagram_path=result
            )
        else:
            return BPMNResponse(
                status="error",
                message="Ошибка при создании диаграммы",
                error=result
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
