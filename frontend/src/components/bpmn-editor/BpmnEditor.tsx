import { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import { Button } from "@/components/ui/button";
import { Download, Save, Undo, Redo, ZoomIn, ZoomOut, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Create an empty BPMN 2.0 diagram
const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

interface BpmnEditorProps {
  initialDiagram?: string;
  readOnly?: boolean;
  onSave?: (xml: string) => void;
}

export function BpmnEditor({ initialDiagram, readOnly = false, onSave }: BpmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize the BPMN modeler
    const modeler = new BpmnModeler({
      container: containerRef.current,
      keyboard: { bindTo: document },
    });

    modelerRef.current = modeler;

    // Import the initial diagram or an empty one
    const diagramToImport = initialDiagram || EMPTY_DIAGRAM;
    
    modeler.importXML(diagramToImport).then(() => {
      // Success, adjust the viewport to show all elements
      const canvas = modeler.get('canvas');
      canvas.zoom('fit-viewport');
      
      if (readOnly) {
        // Disable interaction in read-only mode
        canvas.viewbox(canvas.viewbox());
        modeler.get('palette').hide();
        modeler.get('contextPad').hide();
      }
    }).catch((err: Error) => {
      console.error('Error importing BPMN diagram', err);
      toast({
        title: "Ошибка загрузки диаграммы",
        description: "Не удалось загрузить BPMN диаграмму",
        variant: "destructive"
      });
    });

    return () => {
      modeler.destroy();
    };
  }, [initialDiagram, readOnly, toast]);

  const handleSave = async () => {
    if (!modelerRef.current || !onSave) return;

    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      onSave(xml);
      toast({
        title: "Диаграмма сохранена",
        description: "BPMN диаграмма успешно сохранена"
      });
    } catch (err) {
      console.error('Error saving BPMN diagram', err);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить BPMN диаграмму",
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    if (!modelerRef.current) return;

    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'diagram.bpmn';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting BPMN diagram', err);
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось экспортировать BPMN диаграмму",
        variant: "destructive"
      });
    }
  };

  const handleUndo = () => {
    if (!modelerRef.current) return;
    modelerRef.current.get('commandStack').undo();
  };

  const handleRedo = () => {
    if (!modelerRef.current) return;
    modelerRef.current.get('commandStack').redo();
  };

  const handleZoomIn = () => {
    if (!modelerRef.current) return;
    modelerRef.current.get('zoomScroll').stepZoom(1);
  };

  const handleZoomOut = () => {
    if (!modelerRef.current) return;
    modelerRef.current.get('zoomScroll').stepZoom(-1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      <div className="border-b p-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center space-x-2">
          {!readOnly && (
            <>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleUndo}
                title="Отменить"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRedo}
                title="Повторить"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleZoomIn}
            title="Увеличить"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleZoomOut}
            title="Уменьшить"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          {!readOnly && onSave && (
            <Button 
              variant="outline"
              onClick={handleSave}
              className="flex items-center space-x-1"
            >
              <Save className="h-4 w-4 mr-1" />
              <span>Сохранить</span>
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={handleExport}
            className="flex items-center space-x-1"
          >
            <Download className="h-4 w-4 mr-1" />
            <span>Экспорт</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className="flex-1 bpmn-editor-container"
        style={{
          height: '100%',
          width: '100%',
          overflow: 'hidden'
        }}
      />
    </div>
  );
} 