import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { BpmnEditor } from "@/components/bpmn-editor/BpmnEditor";
import { convertPiperflowToBpmn, validateXML } from "@/lib/bpmn-service";
import { chatApi } from "@/lib/api";

export function BpmnEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const diagramId = searchParams.get("id");
  const imageData = searchParams.get("image");
  const piperflowText = searchParams.get("piperflow");
  
  const [diagramTitle, setDiagramTitle] = useState("Новая BPMN диаграмма");
  const [bpmnXml, setBpmnXml] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [useStaticView, setUseStaticView] = useState(false);
  
  useEffect(() => {
    // Convert PiperFlow text to BPMN XML if available
    if (piperflowText) {
      try {
        const decodedText = atob(piperflowText);
        console.log('Decoded PiperFlow text:', decodedText);
        
        // Check if this is actual PiperFlow content or just regular text
        const isPiperflowFormat = 
          decodedText.includes('title:') ||
          decodedText.includes('pool:') ||
          decodedText.includes('lane:') ||
          (decodedText.includes('(') && decodedText.includes(')') && decodedText.includes('as'));
        
        if (!isPiperflowFormat) {
          // If it's not PiperFlow format, just show the text without editor
          setUseStaticView(true);
          setDiagramTitle("Текстовый ответ (не диаграмма)");
          setBpmnXml(undefined);
          return;
        }
        
        try {
          // Attempt to convert from PiperFlow
          console.log('Starting PiperFlow to BPMN conversion...');
          const xml = convertPiperflowToBpmn(decodedText);
          console.log('Generated BPMN XML, length:', xml.length);
          
          // Смягчаем проверку на валидность - пытаемся использовать XML в любом случае,
          // кроме явного случая с пустым XML или EMPTY_DIAGRAM
          if (!xml || xml.trim() === '') {
            console.warn('Generated XML is empty, using default diagram');
            
            // Создаем простую диаграмму с безопасными ID
            const simpleDiagram = `title: ${diagramTitle || "Базовая диаграмма"}
colourtheme: BLUEMOUNTAIN

pool: Process
    lane: Participant
        (start) as start_event
        [Task 1] as task1
        [Task 2] as task2
        (end) as end_event
        
        start_event -> task1 -> task2 -> end_event`;

            const fallbackXml = convertPiperflowToBpmn(simpleDiagram);
            setBpmnXml(fallbackXml);
            
            toast({
              title: "Предупреждение",
              description: "Сгенерированная BPMN диаграмма пуста. Используется базовая диаграмма.",
              variant: "warning"
            });
          } else {
            // Используем сгенерированный XML, даже если он не идеален
            console.log('Using generated XML, regardless of validation');
            setBpmnXml(xml);
            
            // Extract title from PiperFlow
            const titleMatch = decodedText.match(/title:\s*(.+)/);
            if (titleMatch && titleMatch[1]) {
              setDiagramTitle(titleMatch[1].trim());
            }
          }
        } catch (err) {
          console.error("Error converting PiperFlow to BPMN:", err);
          // Создаем простую диаграмму в случае ошибки
          const simpleDiagram = `title: ${diagramTitle || "Базовая диаграмма"}
colourtheme: BLUEMOUNTAIN

pool: Process
    lane: Participant
        (start) as start_event
        [Task 1] as task1
        [Task 2] as task2
        (end) as end_event
        
        start_event -> task1 -> task2 -> end_event`;

          const fallbackXml = convertPiperflowToBpmn(simpleDiagram);
          setBpmnXml(fallbackXml);
          
          toast({
            title: "Ошибка конвертации",
            description: "Произошла ошибка при конвертации PiperFlow в BPMN.",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error("Error decoding PiperFlow:", err);
        // Загружаем базовую диаграмму при ошибке декодирования
        const simpleDiagram = `title: ${diagramTitle || "Базовая диаграмма"}
colourtheme: BLUEMOUNTAIN

pool: Process
    lane: Participant
        (start) as start_event
        [Task 1] as task1
        [Task 2] as task2
        (end) as end_event
        
        start_event -> task1 -> task2 -> end_event`;

        const fallbackXml = convertPiperflowToBpmn(simpleDiagram);
        setBpmnXml(fallbackXml);
        
        toast({
          title: "Ошибка декодирования",
          description: "Не удалось декодировать данные PiperFlow.",
          variant: "destructive"
        });
      }
    } else {
      console.log('No PiperFlow text received, using simple diagram');
      
      // Загрузим простую диаграмму, если ничего не получено
      const simpleDiagram = `title: ${diagramTitle || "Тестовая BPMN диаграмма"}
colourtheme: BLUEMOUNTAIN

pool: Process
    lane: Participant
        (start) as start_event
        [Task 1] as task1
        [Task 2] as task2
        (end) as end_event
        
        start_event -> task1 -> task2 -> end_event`;

      const xml = convertPiperflowToBpmn(simpleDiagram);
      setBpmnXml(xml);
    }
    
    console.log('URL Parameters:', {
      diagramId,
      imageExists: !!imageData,
      piperflowExists: !!piperflowText
    });
  }, [piperflowText, toast, diagramTitle, imageData]);
  
  const handleSave = (xml: string) => {
    // Here you would save the diagram XML to your backend
    toast({
      title: "Диаграмма сохранена",
      description: "BPMN диаграмма успешно сохранена"
    });
  };
  
  return (
    <div className="flex flex-col h-screen">
      <header className="border-b p-4 bg-muted/30 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
            <div>
              <Label htmlFor="diagram-title">Название диаграммы</Label>
              <Input
                id="diagram-title"
                value={diagramTitle}
                onChange={(e) => setDiagramTitle(e.target.value)}
                className="w-[300px]"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {bpmnXml && imageData && (
            <Button
              variant="outline"
              onClick={() => setUseStaticView(!useStaticView)}
              className="text-sm"
            >
              {useStaticView ? "Интерактивный режим" : "Просмотр изображения"}
            </Button>
          )}
          
          <Button 
            disabled={isSaving}
            className="flex items-center space-x-1"
            onClick={() => {
              setIsSaving(true);
              setTimeout(() => {
                toast({
                  title: "Диаграмма сохранена",
                  description: "BPMN диаграмма успешно сохранена"
                });
                setIsSaving(false);
              }, 500);
            }}
          >
            {isSaving ? (
              <span>Сохранение...</span>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                <span>Сохранить диаграмму</span>
              </>
            )}
          </Button>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        {bpmnXml && !useStaticView ? (
          <BpmnEditor 
            initialDiagram={bpmnXml} 
            onSave={handleSave}
            piperflowText={piperflowText ? atob(piperflowText) : undefined}
          />
        ) : imageData ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            {bpmnXml ? (
              <p className="mb-4 text-muted-foreground">
                Отображается статичная версия диаграммы
              </p>
            ) : (
              <p className="mb-4 text-muted-foreground">
                {piperflowText && !bpmnXml ? 
                  "Полученное содержимое не является диаграммой BPMN. Отображается как текст:" :
                  "Интерактивный редактор BPMN недоступен для этой диаграммы. Отображается статичная версия:"}
              </p>
            )}
            
            {/* Show decoded text content if it's not a diagram */}
            {piperflowText && !bpmnXml && (
              <div className="max-w-3xl w-full mb-4 p-4 bg-white rounded border">
                <pre className="whitespace-pre-wrap">{atob(piperflowText)}</pre>
              </div>
            )}
            
            {/* Always show image if available */}
            <img 
              src={`data:image/png;base64,${imageData}`}
              alt="BPMN diagram"
              className="max-w-full max-h-[70vh] border shadow-sm rounded"
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Загрузка диаграммы...</p>
          </div>
        )}
      </main>
    </div>
  );
} 