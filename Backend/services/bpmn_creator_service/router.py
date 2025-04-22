from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

# Configure logging
logger = logging.getLogger(__name__)

from .bpmn_service import generate_bpmn_diagram

router = APIRouter()

class BpmnRequest(BaseModel):
    description: str

class BpmnResponse(BaseModel):
    success: bool
    image: Optional[str] = None
    text: Optional[str] = None
    error: Optional[str] = None

@router.post("/generate", response_model=BpmnResponse)
async def create_bpmn_diagram(request: BpmnRequest):
    """
    Generate a BPMN diagram from a text description
    """
    if not request.description:
        raise HTTPException(status_code=400, detail="Description is required")
    
    logger.info(f"Generating BPMN diagram from description: {request.description[:50]}...")
    result = await generate_bpmn_diagram(request.description)
    
    if not result.get("success", False):
        logger.error(f"Failed to generate BPMN diagram: {result.get('error')}")
        return BpmnResponse(
            success=False,
            error=result.get("error", "Failed to generate BPMN diagram")
        )
    
    logger.info("BPMN diagram generated successfully")
    return BpmnResponse(
        success=True,
        image=result.get("image"),
        text=result.get("text")
    ) 