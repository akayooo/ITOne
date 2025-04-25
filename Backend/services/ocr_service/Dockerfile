# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required by Tesseract and other libraries
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    # Add any other system dependencies your libraries might need
    # For example, OpenCV might need libgl1-mesa-glx
    # libgl1-mesa-glx \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
# Assuming the main requirements.txt contains all needed dependencies
# Ideally, ocr_service should have its own minimal requirements.txt
COPY ../../../requirements.txt /app/requirements.txt

# Install any needed packages specified in requirements.txt
# Using --no-cache-dir to reduce image size
RUN pip install --no-cache-dir -r requirements.txt

# Copy the OCR service code into the container at /app
COPY . /app/

# Make port 8001 available to the world outside this container
EXPOSE 8001

# Define environment variable for Tesseract command if needed by pytesseract
# ENV TESSERACT_CMD=/usr/bin/tesseract

# Run uvicorn server
# Use 0.0.0.0 to allow connections from outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"] 