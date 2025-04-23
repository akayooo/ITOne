import { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import { Button } from "@/components/ui/button";
import { Download, Save, Undo, Redo, ZoomIn, ZoomOut, Maximize, Minimize, RefreshCw } from "lucide-react";
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
  fallbackImage?: string; // Base64 image to display if editor fails
}

export function BpmnEditor({ initialDiagram, readOnly = false, onSave, fallbackImage }: BpmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFallbackImage, setUseFallbackImage] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
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
    
    // If fallback image is being used, don't initialize the modeler
    if (useFallbackImage && fallbackImage) {
      return;
    }
    
    console.log('BpmnEditor: Container is ready, initializing modeler');
    try {
      // Note: No need for additionalModules to fix the "No provider for 0" error
      // Initialize with minimal required configuration
      const modeler = new BpmnModeler({
        container: containerRef.current,
        keyboard: { bindTo: document }
      });
      
      modelerRef.current = modeler;
      
      // Import the initial diagram with a slight delay
      const diagramToImport = initialDiagram || EMPTY_DIAGRAM;
      console.log('BpmnEditor: Importing diagram, length:', diagramToImport.length, 'starts with:', diagramToImport.substring(0, 100));
      
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
              
              // Safely hide palette and context panel if available
              try {
                const palette = modeler.get('palette');
                if (palette && typeof palette.hide === 'function') {
                  palette.hide();
                }
              } catch (err) {
                console.warn('BpmnEditor: Error hiding palette:', err);
              }
              
              try {
                const contextPad = modeler.get('contextPad');
                if (contextPad && typeof contextPad.hide === 'function') {
                  contextPad.hide();
                }
              } catch (err) {
                console.warn('BpmnEditor: Error hiding contextPad:', err);
              }
            }
            
            // Clear any previous errors
            setError(null);
          })
          .catch((err: Error) => {
            console.error('BpmnEditor: Error importing BPMN diagram', err);
            // Check for specific XML structure issues
            if (diagramToImport) {
              const hasCollaboration = diagramToImport.includes('<bpmn:collaboration');
              const hasProcess = diagramToImport.includes('<bpmn:process');
              const hasDiagram = diagramToImport.includes('<bpmndi:BPMNDiagram');
              console.error('BPMN XML diagnostic:', {
                hasCollaboration,
                hasProcess,
                hasDiagram,
                length: diagramToImport.length
              });
            }
            
            handleError(err);
            
            // Switch to fallback image if available and we've tried at least once
            if (fallbackImage && retryCount > 0) {
              console.log('BpmnEditor: Switching to fallback image');
              setUseFallbackImage(true);
            }
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
      
      // Switch to fallback image if available
      if (fallbackImage) {
        console.log('BpmnEditor: Switching to fallback image due to initialization error');
        setUseFallbackImage(true);
      }
    }
  }, [initialDiagram, isReady, readOnly, useFallbackImage, fallbackImage, retryCount]);

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
    try {
      modelerRef.current.get('commandStack').undo();
    } catch (err) {
      console.warn('Error executing undo:', err);
    }
  };

  const handleRedo = () => {
    if (!modelerRef.current) return;
    try {
      modelerRef.current.get('commandStack').redo();
    } catch (err) {
      console.warn('Error executing redo:', err);
    }
  };

  const handleZoomIn = () => {
    if (!modelerRef.current) return;
    try {
      modelerRef.current.get('zoomScroll').stepZoom(1);
    } catch (err) {
      console.warn('Error zooming in:', err);
    }
  };

  const handleZoomOut = () => {
    if (!modelerRef.current) return;
    try {
      modelerRef.current.get('zoomScroll').stepZoom(-1);
    } catch (err) {
      console.warn('Error zooming out:', err);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  const handleRetry = () => {
    setUseFallbackImage(false);
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  const handleError = (err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    setError(errorMessage);
    toast({
      title: "Ошибка редактора BPMN",
      description: errorMessage,
      variant: "destructive"
    });
  };

  return (
    <div className={`bpmn-editor ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'relative'}`}>
      {/* Toolbar */}
      <div className="bg-muted p-1 shadow-sm flex items-center space-x-1 rounded-t-md">
        {!readOnly && (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSave} 
              disabled={!modelerRef.current || useFallbackImage}
              title="Сохранить"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleExport} 
              disabled={!modelerRef.current || useFallbackImage}
              title="Скачать как BPMN файл"
            >
              <Download className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleUndo} 
              disabled={!modelerRef.current || useFallbackImage}
              title="Отменить"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRedo} 
              disabled={!modelerRef.current || useFallbackImage}
              title="Повторить"
            >
              <Redo className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
          </>
        )}
        
        {!useFallbackImage && (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleZoomIn} 
              disabled={!modelerRef.current}
              title="Увеличить"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleZoomOut} 
              disabled={!modelerRef.current}
              title="Уменьшить"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {/* Show retry button if using fallback image */}
        {useFallbackImage && fallbackImage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRetry}
            title="Попробовать загрузить редактор"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        
        <div className="flex-1" />
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleFullscreen}
          title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Editor Container */}
      <div 
        className="border rounded-b-md overflow-hidden"
        style={{ height: isFullscreen ? 'calc(100vh - 48px)' : '100%', minHeight: '400px' }}
      >
        {/* Fallback image display */}
        {useFallbackImage && fallbackImage ? (
          <div className="h-full w-full flex items-center justify-center bg-white p-4">
            <img 
              src={`data:image/png;base64,${fallbackImage}`} 
              alt="BPMN diagram" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div 
            ref={containerRef} 
            className="bpmn-container h-full w-full"
          />
        )}
      </div>
      
      {/* Error display */}
      {error && !useFallbackImage && (
        <div className="bg-destructive/10 text-destructive p-2 text-sm rounded-md mt-2">
          <div className="flex justify-between items-center">
            <div>
              <strong>Error:</strong> {error}
            </div>
            {fallbackImage && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setUseFallbackImage(true)}
                className="ml-2"
              >
                Show Image
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 