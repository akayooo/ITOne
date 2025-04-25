import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui button
import { Input } from '@/components/ui/input';   // Assuming shadcn/ui input
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react'; // Loading spinner

// URL for the OCR backend service
// Make sure the OCR service is running at this address and port
const OCR_API_URL = 'http://localhost:8001/ocr';

const OcrUploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setError(null); // Clear previous error on new file selection
        setExtractedText(null); // Clear previous results
        setTotalPages(null);
      } else {
        setSelectedFile(null);
        setError('Пожалуйста, выберите PDF файл.');
      }
    } else {
      setSelectedFile(null);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) {
      setError('Файл не выбран.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedText(null);
    setTotalPages(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post<{ text: string; pages: number }>(
        OCR_API_URL,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setExtractedText(response.data.text);
      setTotalPages(response.data.pages);
    } catch (err: any) {
      console.error('Error uploading or processing file:', err);
      let errorMessage = 'Произошла ошибка при обработке файла.';
      if (axios.isAxiosError(err) && err.response) {
        // Try to get detail from backend error response
        errorMessage = err.response.data?.detail || err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(`Ошибка OCR: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Загрузка PDF для OCR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid w-full max-w-sm items-center gap-1.5 mb-4">
            <Label htmlFor="pdf-upload">Выберите PDF файл</Label>
            <Input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>

          {selectedFile && (
            <p className="text-sm text-muted-foreground mb-4">
              Выбран файл: {selectedFile.name}
            </p>
          )}

          <Button onClick={handleSubmit} disabled={!selectedFile || isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Обработка...</>
            ) : (
              'Извлечь текст'
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {extractedText !== null && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Извлеченный текст</CardTitle>
                {totalPages !== null && (
                    <p className="text-sm text-muted-foreground">Обработано страниц: {totalPages}</p>
                )}
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm p-4 bg-muted rounded-md overflow-auto max-h-96">
                  {extractedText}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OcrUploadPage; 