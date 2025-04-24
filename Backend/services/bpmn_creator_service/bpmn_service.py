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
import asyncio
import time

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

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1

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
        
        image_base64 = None
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                # Используем безопасную обертку для рендеринга
                logger.info(f"Attempt {attempt + 1}/{MAX_RETRIES}: Generating diagram using safe wrapper")
                image_base64 = render_to_base64(piperflow_text)

                if image_base64:
                    logger.info("Diagram generated successfully.")
                    break # Exit loop on success
                else:
                    last_error = "Failed to generate diagram (render_to_base64 returned None)"
                    logger.warning(f"Attempt {attempt + 1} failed: {last_error}")

            except Exception as e:
                last_error = f"Exception during rendering attempt {attempt + 1}: {str(e)}"
                logger.warning(last_error)
                # Optional: Log traceback for debugging
                # import traceback
                # traceback.print_exc()

            # If not the last attempt and failed, wait before retrying
            if attempt < MAX_RETRIES - 1 and not image_base64:
                logger.info(f"Waiting {RETRY_DELAY_SECONDS}s before next attempt...")
                await asyncio.sleep(RETRY_DELAY_SECONDS) # Use asyncio.sleep in async function

        if not image_base64:
            logger.error(f"Failed to generate diagram after {MAX_RETRIES} attempts. Last error: {last_error}")
            return {
                "success": False,
                "error": last_error or "Failed to generate diagram after retries" # Use last error if available
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