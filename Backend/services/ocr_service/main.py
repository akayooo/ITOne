import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ocr import OCRService
import logging

# Configure logging (optional, if not handled by OCRService)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# --- CORS Middleware --- 
# Allows requests from your frontend development server (e.g., http://localhost:5173)
# Adjust origins if your frontend runs on a different port or domain
origins = [
    "http://localhost",
    "http://localhost:5173", # Default Vite dev server port
    "http://localhost:3000", # Add the port from the error message
    # Add other origins if needed (e.g., your deployed frontend URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# --- Initialize OCR Service --- 
try:
    # Initialize with Transformers enabled (adjust if needed)
    ocr_service = OCRService(use_transformers=True) 
except Exception as e:
    logger.error(f"Failed to initialize OCR Service: {e}")
    # You might want to handle this more gracefully, maybe exit or run without OCR
    ocr_service = None 

# --- API Endpoint --- 
@app.post("/ocr")
async def process_pdf_endpoint(file: UploadFile = File(...)):
    """
    Receives a PDF file upload, extracts text using OCRService, and returns the text.
    """
    if not ocr_service:
        raise HTTPException(status_code=503, detail="OCR Service is not available")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are accepted.")

    try:
        logger.info(f"Received file: {file.filename}")
        # Read file content as bytes
        file_bytes = await file.read()
        
        # Process using OCR service
        # Pass file_bytes and explicitly state file_type
        result = ocr_service.extract_text(file_bytes=file_bytes, file_type='pdf')
        
        logger.info(f"Successfully processed {file.filename}")
        return {"text": result.get("text", ""), "pages": result.get("pages", 0)}

    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error processing file: {str(e)}")

# --- Run the server (for local development) --- 
if __name__ == "__main__":
    # Use port 8001 to avoid conflict with other services (like frontend dev server)
    uvicorn.run(app, host="0.0.0.0", port=8001) 