import { toast } from '@/components/ui/use-toast';

export interface BPMNResponse {
  status: string;
  message: string;
  piperflow_text?: string;
  diagram_path?: string;
  error?: string;
  recommendations?: string;
}

export interface BPMNRequest {
  user_prompt: string;
  piperflow_text?: string;
  recommendations?: string;
  business_requirements?: string;
}

export interface BPMNError {
  isNotBPMNRelated: boolean;
  message: string;
}

const NOT_BPMN_ERROR_MESSAGE = "Ваш запрос не относится к моей специализации. Пожалуйста, задайте вопрос, касающийся моделирования бизнес-процессов, BPMN диаграмм или библиотеки processpiper.";

export const handleBPMNResponse = async (response: Response): Promise<{ data: BPMNResponse | null; error: BPMNError | null }> => {
  if (response.status === 400) {
    const errorData = await response.json();
    
    // Check if this is a non-BPMN related request
    const isNotBPMNRelated = errorData.detail === NOT_BPMN_ERROR_MESSAGE;
    
    toast({
      title: isNotBPMNRelated ? "Некорректный запрос" : "Ошибка",
      description: errorData.detail || "Произошла ошибка при обработке запроса",
      variant: "destructive",
    });

    return {
      data: null,
      error: {
        isNotBPMNRelated,
        message: errorData.detail
      }
    };
  }

  if (!response.ok) {
    toast({
      title: "Ошибка",
      description: "Произошла ошибка при обработке запроса",
      variant: "destructive",
    });
    return { data: null, error: null };
  }

  const data: BPMNResponse = await response.json();
  
  if (data.status === "error") {
    toast({
      title: "Ошибка",
      description: data.error || "Произошла ошибка при создании диаграммы",
      variant: "destructive",
    });
    return { data: null, error: null };
  }

  return { data, error: null };
};

export const processBPMNRequest = async (request: BPMNRequest): Promise<{ data: BPMNResponse | null; error: BPMNError | null }> => {
  try {
    const response = await fetch("/api/bpmn/process_bpmn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    return handleBPMNResponse(response);
  } catch (error) {
    console.error("Error processing BPMN request:", error);
    toast({
      title: "Ошибка",
      description: "Произошла ошибка при отправке запроса",
      variant: "destructive",
    });
    return { data: null, error: null };
  }
}; 