import { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import { Button } from "@/components/ui/button";
import { Download, Save, Undo, Redo, ZoomIn, ZoomOut, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Create an empty BPMN 2.0 diagram
const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_Empty"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Empty" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_Empty">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="159" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="185" y="202" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="270" y="137" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="432" y="159" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="440" y="202" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="177" />
        <di:waypoint x="270" y="177" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="177" />
        <di:waypoint x="432" y="177" />
      </bpmndi:BPMNEdge>
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
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Step 1: Initialize the container and set it as ready
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Make sure the container has valid dimensions
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setIsReady(true);
          resizeObserver.disconnect();
        }
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Step 2: Initialize the modeler once the container is ready
  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    
    console.log('BpmnEditor: Container is ready, initializing modeler');
    try {
      // Load bpmn-js modules
      const additionalModules = [];
      
      // Initialize with all necessary modules
      const modeler = new BpmnModeler({
        container: containerRef.current,
        keyboard: { bindTo: document },
        additionalModules: additionalModules,
        // Ensure we have minimal required modules
        moddleExtensions: {
          camunda: {
            name: 'Camunda',
            prefix: 'camunda',
            uri: 'http://camunda.org/schema/1.0/bpmn'
          }
        }
      });
      
      modelerRef.current = modeler;
      
      // Print available modules for debugging
      console.log('BpmnEditor: Available modules:', 
        Object.keys(modeler._modules)
          .filter(name => typeof modeler.get(name) !== 'undefined')
          .join(', ')
      );
      
      // Import the initial diagram with a slight delay
      const diagramToImport = initialDiagram || EMPTY_DIAGRAM;
      console.log('BpmnEditor: Importing diagram, length:', diagramToImport.length);
      
      // Add a small timeout to ensure the DOM is fully rendered
      setTimeout(() => {
        modeler.importXML(diagramToImport)
          .then(({ warnings }) => {
            // Success, adjust the viewport to show all elements
            if (warnings && warnings.length) {
              console.warn('BpmnEditor: Warnings while importing BPMN XML:', warnings);
            }
            
            console.log('BpmnEditor: BPMN diagram imported successfully');
            const canvas = modeler.get('canvas');
            canvas.zoom('fit-viewport');
            
            if (readOnly) {
              // Disable interaction in read-only mode
              canvas.viewbox(canvas.viewbox());
              
              // Безопасно скрыть палитру и контекстную панель, если они доступны
              try {
                const palette = modeler.get('palette');
                if (palette && typeof palette.hide === 'function') {
                  palette.hide();
                } else {
                  console.log('BpmnEditor: Palette module not available or hide method not found');
                }
              } catch (err) {
                console.warn('BpmnEditor: Error hiding palette:', err);
              }
              
              try {
                const contextPad = modeler.get('contextPad');
                if (contextPad && typeof contextPad.hide === 'function') {
                  contextPad.hide();
                } else {
                  console.log('BpmnEditor: ContextPad module not available or hide method not found');
                }
              } catch (err) {
                console.warn('BpmnEditor: Error hiding contextPad:', err);
              }
            }
          })
          .catch((err: Error) => {
            console.error('BpmnEditor: Error importing BPMN diagram', err);
            handleError(err);
          });
      }, 100);
      
      return () => {
        // Ensure clean destruction
        try {
          modeler.destroy();
        } catch (e) {
          console.error('BpmnEditor: Error destroying modeler', e);
        }
      };
    } catch (err) {
      console.error('BpmnEditor: Error initializing BPMN modeler', err);
      handleError(err);
    }
  }, [initialDiagram, isReady, readOnly, toast]);

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
      handleError(err);
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
      handleError(err);
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

  // При получении ошибки, установим её в состоянии
  const handleError = (err: Error) => {
    console.error('BpmnEditor: Error', err);
    setError(err.message || 'Произошла ошибка при загрузке редактора');
    toast({
      title: "Ошибка редактора",
      description: err.message || 'Произошла ошибка при загрузке редактора',
      variant: "destructive"
    });
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
      
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-red-50 text-red-600">
          <p className="font-medium text-lg">Ошибка редактора BPMN</p>
          <p className="mt-2">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setError(null)}
          >
            Попробовать снова
          </Button>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="flex-1 bpmn-editor-container"
          style={{
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '300px' // Обеспечиваем минимальную высоту
          }}
        />
      )}
    </div>
  );
} 