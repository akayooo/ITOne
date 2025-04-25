from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
# import processpiper # No longer needed for XML conversion here
import os
from .api import call_deepseek_api
# from processpiper.text2diagram import render # No longer needed

router = APIRouter()

class BPMNRequest(BaseModel):
    user_prompt: str
    # Assuming we might still need previous XML for editing, rename piperflow_text
    previous_bpmn_xml: Optional[str] = None 
    # Recommendations might need separate handling now or a different prompt
    recommendations: Optional[str] = None 
    business_requirements: Optional[str] = "1. Схема должна быть грамотная и удобная для чтения. 2. Если возможно какой-то комплексный блок разбить на меньшие блоки - сделай это"

class BPMNResponse(BaseModel):
    status: str
    message: str
    bpmn_xml: Optional[str] = None # Changed from piperflow_text and xml
    error: Optional[str] = None
    # Recommendations might need separate handling
    recommendations: Optional[str] = None 

# --- New XML Generation Prompt ---
XML_GENERATION_PROMPT_TEMPLATE = """\
Ты — эксперт-консультант по бизнес-процессам, специализирующийся на моделировании с использованием стандарта BPMN 2.0. Твоя основная задача — анализировать текстовые описания бизнес-процессов{previous_context} и преобразовывать их в валидный XML-код BPMN 2.0.

Не забывай ковычки! "

Входные данные: 
{input_data_description}

Требования к выходным данным:
1.  Сгенерированный XML должен строго соответствовать спецификации BPMN 2.0.
2.  XML должен корректно отображаться в средствах просмотра bpmn.js.
3.  Диаграмма должна быть логичной, понятной и, по возможности, аккуратно разложенной, следуя лучшим практикам моделирования BPMN.
4.  Ты ДОЛЖЕН выводить ТОЛЬКО чистый XML-код. Никакого вводного текста, объяснений, извинений, комментариев или форматирования markdown (например, ```xml ... ```) не допускается. Только XML.

Пример структуры и элементов валидного BPMN 2.0 XML для справки (обрати внимание на структуру, именование элементов и использование атрибутов):

<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="sid-38422fae-e03e-43a3-bef4-bd33b32041b2" targetNamespace="http://bpmn.io/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="18.3.1">
  <collaboration id="Collaboration_{{random_id}}">
    <participant id="Participant_1" processRef="Process_1" name="Пул 1"/>
    <!-- Add more participants, lanes, groups, annotations, message flows as needed based on input -->
  </collaboration>
  <process id="Process_1" isExecutable="false">
     <laneSet id="LaneSet_1">
        <lane id="Lane_1" name="Дорожка 1">
           <!-- Add flowNodeRefs -->
        </lane>
     </laneSet>
    <startEvent id="StartEvent_1" name="Начало Процесса">
      <outgoing>SequenceFlow_1</outgoing>
    </startEvent>
    <task id="Task_1" name="Задача 1">
      <incoming>SequenceFlow_1</incoming>
      <outgoing>SequenceFlow_2</outgoing>
    </task>
    <!-- Add more tasks, gateways, events, subprocesses, data objects etc. -->
    <endEvent id="EndEvent_1" name="Конец Процесса">
      <incoming>SequenceFlow_N</incoming> 
    </endEvent>
    <!-- Define sequence flows -->
    <sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <!-- ... other sequence flows ... -->
    <sequenceFlow id="SequenceFlow_N" sourceRef="..." targetRef="EndEvent_1" />
  </process>
  <!-- Add more process definitions if needed for collaboration -->
  <!-- Add BPMNDiagram section for layout -->
  <bpmndi:BPMNDiagram id="BpmnDiagram_1">
    <bpmndi:BPMNPlane id="BpmnPlane_1" bpmnElement="Collaboration_{{random_id}}">
       <!-- Define BPMNShape and BPMNEdge for layout -->
       <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true"> <omgdc:Bounds x="150" y="50" width="600" height="250" /> </bpmndi:BPMNShape>
       <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true"> <omgdc:Bounds x="180" y="50" width="570" height="250" /> </bpmndi:BPMNShape>
       <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"> <omgdc:Bounds x="222" y="132" width="36" height="36" /> </bpmndi:BPMNShape>
       <!-- ... other shapes and edges ... -->
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
"""

# --- Removed old PiperFlow templates ---

def type_choose(input_text: str) -> str:
    """Определяет тип запроса"""
    router_template = """\
    Вам нужно классифицировать пользовательский запрос по одному из трёх типов:
    1) TYPE_1 — "Создать диаграмму с нуля по описанию"
    2) TYPE_2 — "Добавить элемент(ы) в уже существующую диаграмму" (примеры: "Добавь новый блок...", "Добавить еще один шаг...", "Дополнить диаграмму...", "Добавь этап...", "Расширить схему...", "Нужно добавить...", "Включи в диаграмму...")
    3) TYPE_3 — "Редактировать существующую диаграмму по правкам от пользователя или рекомендациям" (примеры: "Измени задачу X на Y", "Поменяй порядок Z и W", "Удали шлюз G", "Примени рекомендации")

    Отвечайте строго одним кодовым словом: TYPE_1, TYPE_2 или TYPE_3.

    Вопрос: {input}  
    Ответ:"""

    final_prompt = router_template.format(input=input_text)
    # Assuming call_deepseek_api returns the classification string
    response = call_deepseek_api(final_prompt)
    # Basic validation/cleanup
    response_clean = response.strip().upper()
    if response_clean in ['TYPE_1', 'TYPE_2', 'TYPE_3']:
        return response_clean
    else:
        # Fallback or raise error - for now, assume TYPE_1 if unsure
        print(f"Warning: Unexpected request type classification '{response}'. Falling back to TYPE_1.")
        return 'TYPE_1' 

def validate_bpmn_request(prompt: str) -> bool:
    """Проверяет, относится ли запрос к BPMN"""
    validation_prompt = """\
    Определите, относится ли запрос к моделированию бизнес-процессов, BPMN диаграммам или библиотеке processpiper.
    Ответьте строго YES или NO.
    
    Запрос: {prompt}
    Ответ:"""
    
    final_prompt = validation_prompt.format(prompt=prompt)
    response = call_deepseek_api(final_prompt)
    return response.strip().upper() == "YES"

# --- Removed extract_piperflow_block ---

# --- Removed recs_generation (needs separate handling or integrated prompt) ---

def format_xml_generation_prompt(user_prompt: str, request_type: str, previous_bpmn_xml: Optional[str] = None, recommendations: Optional[str] = None) -> str:
    """Formats the prompt for XML generation based on request type."""
    
    previous_context = ""
    input_data_description = f"Текстовое описание процесса: {user_prompt}"

    if request_type == 'TYPE_2' or request_type == 'TYPE_3':
        if previous_bpmn_xml:
            previous_context = " на основе существующей BPMN диаграммы"
            input_data_description = f"Существующая BPMN XML диаграмма:\n```xml\n{previous_bpmn_xml}\n```\n\nЗапрос пользователя на {('добавление' if request_type == 'TYPE_2' else 'редактирование')}: {user_prompt}"
            if recommendations and request_type == 'TYPE_3':
                 input_data_description += f"\n\nРекомендации к применению: {recommendations}"
        else:
             # Fallback to creating new if previous XML is missing for edit/add
             print(f"Warning: Request type is {request_type} but previous_bpmn_xml is missing. Treating as TYPE_1.")
             request_type = 'TYPE_1'
             input_data_description = f"Текстовое описание процесса: {user_prompt}" # Reset description

    # Simple placeholder replacement, might need more sophisticated templating
    formatted_prompt = XML_GENERATION_PROMPT_TEMPLATE.format(
        previous_context=previous_context,
        input_data_description=input_data_description
    )
    return formatted_prompt

# --- Removed create_bpmn_xml_from_piperflow ---

@router.post("/process_bpmn", response_model=BPMNResponse)
async def process_bpmn(request: BPMNRequest):
    # Validate if request is BPMN-related
    if not validate_bpmn_request(request.user_prompt):
        return BPMNResponse(
            status="error",
            message="Запрос не относится к моей специализации. Пожалуйста, задайте вопрос, касающийся моделирования бизнес-процессов, BPMN диаграмм или библиотеки processpiper.",
            error="Запрос не по теме BPMN"
        )

    try:
        # Determine request type (add, edit, new)
        request_type = type_choose(request.user_prompt)
        print(f"Determined request type: {request_type}")

        # Format the XML generation prompt based on type
        final_prompt = format_xml_generation_prompt(
            user_prompt=request.user_prompt,
            request_type=request_type,
            previous_bpmn_xml=request.previous_bpmn_xml,
            recommendations=request.recommendations # Pass recommendations if needed for TYPE_3
        )

        # Call DeepSeek API to get the BPMN XML
        print("Sending prompt to DeepSeek for XML generation...")
        bpmn_xml_response = call_deepseek_api(final_prompt)
        print("Received response from DeepSeek.")

        # --- Basic XML Validation/Cleanup (Optional but recommended) ---
        # The prompt asks for pure XML, but let's try to clean it up just in case
        generated_xml = bpmn_xml_response.strip()
        if generated_xml.startswith("```xml"):
             generated_xml = generated_xml[6:]
        if generated_xml.endswith("```"):
             generated_xml = generated_xml[:-3]
        generated_xml = generated_xml.strip()

        if not generated_xml.startswith("<?xml") or not generated_xml.endswith("</definitions>"):
             print("Warning: Generated response doesn't look like complete XML.")
             # Decide how to handle - maybe return error or try to use anyway?
             # For now, let's return an error if it's clearly not XML
             return BPMNResponse(
                 status="error",
                 message="Не удалось сгенерировать валидный BPMN XML.",
                 error="AI response did not contain valid XML structure.",
                 bpmn_xml=generated_xml # Return what we got for debugging
             )
        
        # --- Recommendations Handling (Placeholder) ---
        # TODO: Implement separate call for recommendations if needed,
        # or modify the XML prompt to include them.
        # For now, recommendations are not generated by this flow.
        final_recommendations = None 
        # if request_type != 'TYPE_3': # Example: only generate for new/add
        #     try:
        #         # Need a separate function/prompt for recommendations based on generated XML
        #         # final_recommendations = generate_recommendations_for_xml(generated_xml, ...)
        #         pass 
        #     except Exception as rec_e:
        #         print(f"Error generating recommendations: {rec_e}")


        # Return successful response with the generated XML
        return BPMNResponse(
            status="success",
            message="BPMN XML сгенерирован успешно." if request_type == 'TYPE_1' else "BPMN XML обновлен успешно.",
            bpmn_xml=generated_xml,
            recommendations=final_recommendations # Return generated recommendations if any
        )

    except Exception as e:
        print(f"Error processing BPMN request: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка обработки BPMN запроса: {str(e)}")

# --- Keep other endpoints like /health, /apply_recommendations, /determine_request_type etc. ---
# --- Note: /apply_recommendations might need significant rework ---
# --- It currently expects PiperFlow and applies text-based recommendations ---
# --- It would need to parse XML, apply changes based on recommendations (complex), and re-serialize XML ---

# --- Example placeholder for other endpoints ---

class RecommendationRequest(BaseModel):
    """Request model for applying recommendations."""
    # This model likely needs rework as it expects PiperFlow
    piperflow_text: Optional[str] = None 
    bpmn_xml: str # Now needs XML
    recommendations: str
    business_requirements: Optional[str] = None

class RecommendationResponse(BaseModel):
    """Response model for recommendation application."""
    # This model likely needs rework
    piperflow_text: Optional[str] = None
    bpmn_xml: str # Returns the modified XML
    message: str
    error: Optional[str] = None

# @router.post("/apply_recommendations", response_model=RecommendationResponse)
# async def apply_recommendations(request: RecommendationRequest):
#     # !!! THIS FUNCTION NEEDS COMPLETE REWRITE TO WORK WITH XML !!!
#     # It's complex: Parse XML, understand recommendation, modify XML structure/attributes, serialize back
#     print("Warning: /apply_recommendations endpoint is not functional with XML generation.")
#     raise HTTPException(status_code=501, detail="Applying recommendations directly to XML is not implemented yet.")
    

class RequestTypeRequest(BaseModel):
    message: str

class RequestTypeResponse(BaseModel):
    type: str # 'TYPE_1', 'TYPE_2', 'TYPE_3'
    is_bpmn_related: bool

@router.post("/determine_request_type", response_model=RequestTypeResponse)
async def determine_request_type_endpoint(request: RequestTypeRequest):
    """
    Endpoint to determine the type of user request (create, add, edit)
    and if it's BPMN related.
    """
    try:
        is_related = validate_bpmn_request(request.message)
        req_type = "UNKNOWN"
        if is_related:
            req_type = type_choose(request.message)
            
        return RequestTypeResponse(type=req_type, is_bpmn_related=is_related)
    except Exception as e:
        print(f"Error in determine_request_type: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка определения типа запроса: {str(e)}")


# --- Removed /recommendations, /clear_recommendations, /apply_recommendations stubs ---
# --- Keeping health check ---
@router.get("/health")
async def health_check():
    return {"status": "ok"}

# --- Removing Recommendation generation/clearing/applying endpoints as they need rework ---
# class GenerateRecommendationsRequest(BaseModel):
#     piperflow_text: str # Needs change to bpmn_xml
#     current_process: Optional[str] = None
#     business_requirements: Optional[str] = "..."

# class GenerateRecommendationsResponse(BaseModel):
#     recommendations: str

# @router.post("/recommendations", response_model=GenerateRecommendationsResponse)
# async def generate_recommendations(request: GenerateRecommendationsRequest):
#     # Needs rework for XML input
#     raise HTTPException(status_code=501, detail="Recommendation generation for XML not implemented yet.")

# class ClearRecommendationsRequest(BaseModel):
#    # ... needs rework ...

# class ClearRecommendationsResponse(BaseModel):
#    # ... needs rework ...

# @router.post("/clear_recommendations", ...)
# async def clear_recommendations(...):
#     # Needs rework
#     raise HTTPException(status_code=501, detail="Clearing recommendations not implemented yet.")

