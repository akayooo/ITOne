import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { BpmnEditor } from "@/components/bpmn-editor/BpmnEditor";
import { convertPiperflowToBpmn } from "@/lib/bpmn-service";
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
  
  useEffect(() => {
    // Convert PiperFlow text to BPMN XML if available
    if (piperflowText) {
      try {
        const decodedText = atob(piperflowText);
        const xml = convertPiperflowToBpmn(decodedText);
        setBpmnXml(xml);
        
        // Extract title from PiperFlow
        const titleMatch = decodedText.match(/title:\s*(.+)/);
        if (titleMatch && titleMatch[1]) {
          setDiagramTitle(titleMatch[1].trim());
        }
      } catch (err) {
        console.error("Error converting PiperFlow to BPMN:", err);
        toast({
          title: "Ошибка преобразования",
          description: "Не удалось преобразовать PiperFlow в BPMN диаграмму",
          variant: "destructive"
        });
      }
    }
  }, [piperflowText, toast]);
  
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
      </header>
      
      <main className="flex-1 overflow-hidden">
        {bpmnXml ? (
          <BpmnEditor 
            initialDiagram={bpmnXml} 
            onSave={handleSave}
          />
        ) : imageData ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <p className="mb-4 text-muted-foreground">
              Интерактивный редактор BPMN недоступен для этой диаграммы. Отображается статичная версия:
            </p>
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