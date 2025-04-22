"""
Wrapper module for processpiper to ensure safe handling of Windows paths
"""
import os
import tempfile
import uuid
import logging
from typing import Union, Optional
import base64
from io import BytesIO

logger = logging.getLogger(__name__)

def render_safely(piperflow_text: str) -> Optional[bytes]:
    """
    Safely render a BPMN diagram from PiperFlow text and return image bytes
    
    Args:
        piperflow_text: PiperFlow text representation of the diagram
        
    Returns:
        Image bytes or None if rendering failed
    """
    try:
        from processpiper.text2diagram import render
        
        # Создаем безопасный путь с прямыми слешами
        temp_dir = tempfile.gettempdir()
        filename = f"bpmn_{uuid.uuid4().hex}.png"
        temp_path = os.path.join(temp_dir, filename).replace("\\", "/")
        
        logger.info(f"Rendering diagram to: {temp_path}")
        
        # Проверяем, что входной текст корректный
        if not piperflow_text.strip().startswith("title:"):
            logger.error("Invalid PiperFlow text: must start with 'title:'")
            piperflow_text = f"""
title: Process Diagram
colourtheme: BLUEMOUNTAIN

pool: Default
    lane: User
        (start) as start_event
        [Default Action] as default_action
        (end) as end_event
        
        start_event -> default_action -> end_event
        
footer: Default process diagram
"""
        
        # Генерируем диаграмму
        render(piperflow_text, temp_path)
        
        if not os.path.exists(temp_path):
            logger.error("Diagram was not generated")
            return None
            
        # Читаем файл
        with open(temp_path, 'rb') as img_file:
            image_data = img_file.read()
            
        # Удаляем временный файл
        try:
            os.unlink(temp_path)
        except Exception as e:
            logger.warning(f"Failed to delete temp file: {e}")
            
        return image_data
    except Exception as e:
        logger.error(f"Error rendering diagram: {e}")
        return None

def render_to_base64(piperflow_text: str) -> Optional[str]:
    """
    Render a diagram and return as base64 string
    
    Args:
        piperflow_text: PiperFlow text
        
    Returns:
        Base64 encoded image string or None
    """
    image_data = render_safely(piperflow_text)
    if image_data:
        return base64.b64encode(image_data).decode('utf-8')
    return None 