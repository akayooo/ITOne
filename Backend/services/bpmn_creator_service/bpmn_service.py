import os
import base64
from io import BytesIO
from typing import Dict, Any, Optional
import sys
import subprocess
import logging
import tempfile
import pathlib
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if processpiper is installed, and install it if not
try:
    from processpiper.text2diagram import render
except ImportError:
    logger.info("processpiper not found, attempting to install...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "processpiper"])
    from processpiper.text2diagram import render

from .api import call_deepseek_api
from .processpiper_wrapper import render_to_base64

async def generate_bpmn_diagram(description: str) -> Dict[str, Any]:
    """
    Generate a BPMN diagram from a text description.
    
    Args:
        description: Text description of the business process
        
    Returns:
        Dictionary containing the diagram as a base64-encoded string and the text representation
    """
    try:
        # Generate PiperFlow syntax from description using DeepSeek API
        piperflow_text = call_deepseek_api(prompt=description)
        
        if not piperflow_text:
            return {
                "success": False,
                "error": "Failed to generate PiperFlow syntax from description"
            }
        
        # Replace any double quotes that might cause syntax issues
        piperflow_text = piperflow_text.replace('"', '')
        
        # Используем безопасную обертку для рендеринга
        logger.info("Generating diagram using safe wrapper")
        image_base64 = render_to_base64(piperflow_text)
        
        if not image_base64:
            logger.error("Failed to generate diagram")
            return {
                "success": False,
                "error": "Failed to generate diagram"
            }
        
        # Возвращаем результат
        return {
            "success": True,
            "image": image_base64,
            "text": piperflow_text
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Error generating BPMN diagram: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        } 