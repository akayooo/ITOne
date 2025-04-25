import os
import io
import base64
from typing import Dict, List, Optional, Union, Any
import numpy as np
from PIL import Image
import fitz  # PyMuPDF for PDF handling
import pytesseract
import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OCRService:
    """Service for performing OCR on images and PDFs using multiple backends with fallbacks."""
    
    def __init__(self, use_transformers: bool = True, tesseract_cmd: Optional[str] = None):
        """
        Initialize the OCR service with fallback options.
        
        Args:
            use_transformers: Whether to use the Transformer-based OCR model (TrOCR)
            tesseract_cmd: Path to tesseract executable if needed (optional)
        """
        self.use_tesseract = False
        self.use_transformers = False
        
        # Setup Tesseract if available
        try:
            if tesseract_cmd:
                pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
            # Quick test to see if Tesseract is available
            pytesseract.get_tesseract_version()
            self.use_tesseract = True
            logger.info("Tesseract OCR is available")
        except Exception as e:
            logger.warning(f"Tesseract OCR is not available: {str(e)}")
        
        # Initialize TrOCR if requested
        if use_transformers:
            try:
                logger.info("Loading TrOCR model...")
                self.processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-printed")
                self.model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-printed")
                
                # Move to GPU if available
                if torch.cuda.is_available():
                    self.model.to("cuda")
                    logger.info("TrOCR model loaded on GPU")
                else:
                    logger.info("TrOCR model loaded on CPU")
                
                self.use_transformers = True
            except Exception as e:
                logger.warning(f"Failed to load TrOCR model: {str(e)}")
        
        # Check if we have at least one OCR method available
        if not self.use_tesseract and not self.use_transformers:
            logger.warning("No OCR method is available. Text extraction may be limited.")
    
    def extract_text(self, file_path: Optional[str] = None, file_bytes: Optional[bytes] = None, 
                    file_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract text from various file types.
        
        Args:
            file_path: Path to the file
            file_bytes: File as bytes
            file_type: Type of file ('pdf', 'image', or auto-detect)
            
        Returns:
            Dictionary with extracted text and metadata
        """
        if not file_path and not file_bytes:
            raise ValueError("Either file_path or file_bytes must be provided")
        
        # Determine file type if not specified
        if not file_type:
            if file_path:
                ext = os.path.splitext(file_path)[1].lower()
                if ext in ['.pdf']:
                    file_type = 'pdf'
                elif ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp']:
                    file_type = 'image'
                else:
                    file_type = 'unknown'
            else:
                # Try to detect from bytes (simple magic bytes check)
                if file_bytes[:4] == b'%PDF':
                    file_type = 'pdf'
                else:
                    try:
                        # Try to open as image
                        Image.open(io.BytesIO(file_bytes))
                        file_type = 'image'
                    except:
                        file_type = 'unknown'
        
        # Process based on file type
        if file_type == 'pdf':
            return self.process_pdf(file_path, file_bytes)
        elif file_type == 'image':
            text = self.process_image(file_path if file_path else file_bytes)
            return {"text": text, "pages": 1}
        else:
            # For unknown file types, try to extract text directly if possible
            return {"text": "File type not supported for text extraction", "pages": 0}
    
    def process_pdf(self, file_path: Optional[str] = None, file_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        """
        Extract text from a PDF file using PyMuPDF with OCR fallback.
        
        Args:
            file_path: Path to the PDF file
            file_bytes: PDF file as bytes
            
        Returns:
            Dictionary with extracted text and metadata
        """
        if not file_path and not file_bytes:
            raise ValueError("Either file_path or file_bytes must be provided")
        
        try:
            # Open PDF document
            if file_path:
                doc = fitz.open(file_path)
            else:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
            
            results = []
            total_text = ""
            
            for page_num, page in enumerate(doc):
                # Try to extract text directly
                text = page.get_text()
                
                # If no text was extracted (scanned PDF), try OCR
                if not text.strip() and (self.use_tesseract or self.use_transformers):
                    try:
                        # Convert page to image
                        pix = page.get_pixmap(alpha=False)
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        
                        # Process with OCR
                        text = self.process_image(img)
                    except Exception as e:
                        logger.error(f"OCR failed on page {page_num+1}: {str(e)}")
                
                results.append({
                    "page": page_num + 1,
                    "text": text
                })
                total_text += text + "\n\n"
            
            return {
                "pages": len(doc),
                "page_results": results,
                "text": total_text.strip()
            }
        
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            return {"text": f"Error processing PDF: {str(e)}", "pages": 0}
    
    def process_image(self, image: Union[str, bytes, Image.Image]) -> str:
        """
        Extract text from an image using OCR.
        
        Args:
            image: Path to image file, image bytes, or PIL Image object
            
        Returns:
            Extracted text
        """
        # Convert input to PIL Image if needed
        if isinstance(image, str):
            img = Image.open(image)
        elif isinstance(image, bytes):
            img = Image.open(io.BytesIO(image))
        elif isinstance(image, Image.Image):
            img = image
        else:
            raise ValueError("Image must be a file path, bytes, or PIL Image")
        
        # Try transformer-based OCR first if enabled
        if self.use_transformers:
            try:
                return self._process_with_trocr(img)
            except Exception as e:
                logger.warning(f"TrOCR failed, falling back to Tesseract: {str(e)}")
        
        # Try Tesseract if available
        if self.use_tesseract:
            try:
                return self._process_with_tesseract(img)
            except Exception as e:
                logger.error(f"Tesseract OCR failed: {str(e)}")
        
        # If all OCR methods failed or are unavailable
        return "Text extraction failed - no OCR method available"
    
    def _process_with_trocr(self, image: Image.Image) -> str:
        """Process image with TrOCR model."""
        # Ensure image is RGB
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Preprocess image
        pixel_values = self.processor(image, return_tensors="pt").pixel_values
        if torch.cuda.is_available():
            pixel_values = pixel_values.to("cuda")
        
        # Generate text
        generated_ids = self.model.generate(pixel_values)
        generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        return generated_text
    
    def _process_with_tesseract(self, image: Image.Image) -> str:
        """Process image with Tesseract OCR."""
        # Ensure image is in a format Tesseract can handle
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Extract text using Tesseract
        text = pytesseract.image_to_string(image)
        return text
    
    def process_base64_image(self, base64_string: str) -> str:
        """
        Extract text from a base64-encoded image.
        
        Args:
            base64_string: Base64-encoded image string
            
        Returns:
            Extracted text
        """
        # Decode base64 string
        if "base64," in base64_string:
            base64_string = base64_string.split("base64,")[1]
        
        image_bytes = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_bytes))
        
        return self.process_image(image)


# Example usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python ocr.py <path_to_pdf_file>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not os.path.exists(pdf_path):
        print(f"Error: File '{pdf_path}' not found")
        sys.exit(1)
    
    if not pdf_path.lower().endswith('.pdf'):
        print(f"Error: File '{pdf_path}' is not a PDF file")
        sys.exit(1)
    
    print(f"Processing PDF file: {pdf_path}")
    
    # Initialize OCR service
    ocr_service = OCRService(use_transformers=True)
    
    # Extract text from PDF
    result = ocr_service.extract_text(file_path=pdf_path)
    
    # Print extracted text
    print("\n" + "="*50 + " EXTRACTED TEXT " + "="*50 + "\n")
    print(result["text"])
    print("\n" + "="*120 + "\n")
    
    # Print page statistics
    print(f"Total pages processed: {result['pages']}")
    
    # Print per-page text if needed
    if result["pages"] > 1:
        print("\nWould you like to see text from specific pages? (y/n)")
        choice = input().lower()
        
        if choice == 'y':
            while True:
                print(f"Enter page number (1-{result['pages']}) or 'q' to quit:")
                page_input = input()
                
                if page_input.lower() == 'q':
                    break
                
                try:
                    page_num = int(page_input)
                    if 1 <= page_num <= result['pages']:
                        page_text = result['page_results'][page_num-1]['text']
                        print("\n" + "-"*50 + f" PAGE {page_num} " + "-"*50 + "\n")
                        print(page_text)
                        print("\n" + "-"*120 + "\n")
                    else:
                        print(f"Page number must be between 1 and {result['pages']}")
                except ValueError:
                    print("Please enter a valid page number")
