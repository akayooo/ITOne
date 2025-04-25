import { useState } from 'react';
import { processBPMNRequest, type BPMNError } from '@/lib/bpmn-utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface BPMNEditorContainerProps {
  initialPrompt?: string;
}

export function BPMNEditorContainer({ initialPrompt = '' }: BPMNEditorContainerProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<BPMNError | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await processBPMNRequest({
        user_prompt: prompt
      });

      if (result.error) {
        setError(result.error);
        setShowEditor(false);
      } else if (result.data) {
        setShowEditor(true);
      }
    } catch (e) {
      console.error('Error processing request:', e);
      setShowEditor(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Textarea
              placeholder="Опишите бизнес-процесс или задайте вопрос..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !prompt.trim()}
              className="w-full"
            >
              {isLoading ? 'Обработка...' : 'Отправить'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error?.isNotBPMNRelated && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-red-600">
                Запрос не относится к BPMN
              </p>
              <p className="text-gray-600">
                {error.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {showEditor && !error && (
        <div className="bpmn-editor-content">
          {/* Your BPMN editor components go here */}
        </div>
      )}
    </div>
  );
} 