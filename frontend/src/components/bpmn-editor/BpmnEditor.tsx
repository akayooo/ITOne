import React, { useEffect, useRef, useState } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import { Button } from "@/components/ui/button";
import { Download, Save, Undo, Redo, ZoomIn, ZoomOut, Maximize, Minimize, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Empty diagram template
const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

interface BpmnEditorProps {
  initialDiagram?: string;
  readOnly?: boolean;
  onSave?: (xml: string) => void;
  fallbackImage?: string | null;
}

export function BpmnEditor({ 
  initialDiagram, 
  readOnly = false, 
  onSave,
  fallbackImage
}: BpmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useFallbackImage, setUseFallbackImage] = useState(false);
  const { toast } = useToast();

  // Handle initialization and cleanup
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('BpmnEditor: Initializing modeler');
    try {
      const container = containerRef.current;
      
      // Create modeler
      const modeler = new BpmnModeler({
        container,
        keyboard: { bindTo: container },
      });
      
      modelerRef.current = modeler;

      // Configure readonly state if needed
      if (readOnly && modeler) {
        try {
          const canvas = modeler.get('canvas') as any;
          if (canvas) {
            canvas.hideLayer('controls');
          }
          
          const palette = modeler.get('palette') as any;
          if (palette) {
            palette.close();
          }
          
          const contextPad = modeler.get('contextPad') as any;
          if (contextPad) {
            contextPad.close();
          }
        } catch (err) {
          console.warn('Error setting up readonly mode:', err);
        }
      }

      // Ensure the container is visible before importing
      setTimeout(() => {
        importDiagram();
      }, 100);
    } catch (err) {
      console.error('Error initializing BPMN modeler:', err);
      setError('Failed to initialize diagram editor');
      setIsLoading(false);
    }

    return () => {
      if (modelerRef.current) {
        try {
          modelerRef.current.destroy();
          modelerRef.current = null;
        } catch (err) {
          console.warn('Error destroying modeler:', err);
        }
      }
    };
  }, []);

  const importDiagram = () => {
    if (!modelerRef.current) {
      console.warn('Modeler not initialized');
      setError('Editor not initialized properly');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const xmlToImport = initialDiagram || EMPTY_DIAGRAM;
    
    try {
      console.log('BpmnEditor: Importing diagram');
      
      modelerRef.current.importXML(xmlToImport)
        .then(({ warnings }: { warnings: any[] }) => {
          if (warnings && warnings.length) {
            console.warn('Warnings while importing BPMN:', warnings);
          }
          
          try {
            const canvas = modelerRef.current.get('canvas') as any;
            if (canvas) {
              // Fit diagram to viewport
              canvas.zoom('fit-viewport', 'auto');
            }
          } catch (err) {
            console.warn('Error adjusting canvas:', err);
          }
          
          setIsLoading(false);
        })
        .catch((err: any) => {
          console.error('Error importing BPMN diagram:', err);
          setError('Failed to import diagram');
          setIsLoading(false);
          
          // Switch to fallback image if available
          if (fallbackImage) {
            setUseFallbackImage(true);
          }
        });
    } catch (err) {
      console.error('Exception during diagram import:', err);
      setError('Failed to process diagram');
      setIsLoading(false);
      
      // Switch to fallback image if available
      if (fallbackImage) {
        setUseFallbackImage(true);
      }
    }
  };

  const handleResize = () => {
    if (!modelerRef.current) return;
    
    try {
      const canvas = modelerRef.current.get('canvas') as any;
      if (canvas) {
        canvas.resized();
        canvas.zoom('fit-viewport', 'auto');
      }
    } catch (err) {
      console.warn('Error during resize:', err);
    }
  };

  // Handle container resize
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to save diagram
  const saveDiagram = () => {
    if (!modelerRef.current || !onSave) return;
    
    try {
      modelerRef.current.saveXML({ format: true })
        .then(({ xml }: { xml: string }) => {
          onSave(xml);
          toast({
            title: "Диаграмма сохранена",
            description: "BPMN диаграмма успешно сохранена"
          });
        })
        .catch((err: any) => {
          console.error('Error saving diagram:', err);
          toast({
            title: "Ошибка",
            description: "Не удалось сохранить диаграмму",
            variant: "destructive"
          });
        });
    } catch (err) {
      console.error('Exception during save operation:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить диаграмму",
        variant: "destructive"
      });
    }
  };

  // Function to export diagram
  const handleExport = () => {
    if (!modelerRef.current) return;
    
    try {
      modelerRef.current.saveXML({ format: true })
        .then(({ xml }: { xml: string }) => {
          if (xml) {
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'diagram.bpmn';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            URL.revokeObjectURL(url);
          }
        })
        .catch((err: any) => {
          console.error('Error exporting BPMN diagram:', err);
          toast({
            title: "Ошибка",
            description: "Не удалось экспортировать диаграмму",
            variant: "destructive"
          });
        });
    } catch (err) {
      console.error('Exception during export operation:', err);
    }
  };

  // Additional utility functions for toolbar actions
  const zoomIn = () => {
    if (!modelerRef.current) return;
    try {
      const canvas = modelerRef.current.get('canvas') as any;
      if (canvas) {
        const currentZoom = canvas.zoom();
        canvas.zoom(currentZoom + 0.1);
      }
    } catch (err) {
      console.warn('Error zooming in:', err);
    }
  };

  const zoomOut = () => {
    if (!modelerRef.current) return;
    try {
      const canvas = modelerRef.current.get('canvas') as any;
      if (canvas) {
        const currentZoom = canvas.zoom();
        canvas.zoom(currentZoom - 0.1);
      }
    } catch (err) {
      console.warn('Error zooming out:', err);
    }
  };

  const resetZoom = () => {
    if (!modelerRef.current) return;
    try {
      const canvas = modelerRef.current.get('canvas') as any;
      if (canvas) {
        canvas.zoom('fit-viewport', 'auto');
      }
    } catch (err) {
      console.warn('Error resetting zoom:', err);
    }
  };

  const undo = () => {
    if (!modelerRef.current) return;
    try {
      const commandStack = modelerRef.current.get('commandStack') as any;
      if (commandStack && commandStack.canUndo()) {
        commandStack.undo();
      }
    } catch (err) {
      console.warn('Error undoing:', err);
    }
  };

  const redo = () => {
    if (!modelerRef.current) return;
    try {
      const commandStack = modelerRef.current.get('commandStack') as any;
      if (commandStack && commandStack.canRedo()) {
        commandStack.redo();
      }
    } catch (err) {
      console.warn('Error redoing:', err);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    // Allow the DOM to update, then resize the modeler
    setTimeout(() => {
      handleResize();
    }, 100);
  };

  // Render diagram container with loading state
  return (
    <div className={`bpmn-editor ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'relative'}`}>
      {/* Toolbar */}
      <div className="bg-muted p-1 shadow-sm flex items-center space-x-1 rounded-t-md">
        <div className="flex-1 flex items-center space-x-1">
          {!readOnly && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={saveDiagram} 
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
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={undo} 
                disabled={!modelerRef.current || useFallbackImage}
                title="Отменить"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={redo} 
                disabled={!modelerRef.current || useFallbackImage}
                title="Повторить"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={zoomIn} 
            disabled={!modelerRef.current}
            title="Увеличить"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={zoomOut} 
            disabled={!modelerRef.current}
            title="Уменьшить"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={resetZoom} 
            disabled={!modelerRef.current || useFallbackImage}
            title="Сбросить масштаб"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleFullscreen} 
          title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Editor container */}
      <div 
        className="border rounded-b-md overflow-hidden"
        style={{ height: isFullscreen ? 'calc(100vh - 48px)' : '500px' }}
      >
        {/* Loading indicator */}
        {isLoading && !useFallbackImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Загрузка диаграммы...</span>
          </div>
        )}
        
        {/* Error display */}
        {error && !useFallbackImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
            <div className="text-destructive mb-4">{error}</div>
            {fallbackImage && (
              <Button 
                variant="outline"
                onClick={() => setUseFallbackImage(true)}
              >
                Показать изображение
              </Button>
            )}
          </div>
        )}
        
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
            className="bpmn-canvas w-full h-full" 
            style={{ position: 'relative', height: '100%' }}
          />
        )}
      </div>
    </div>
  );
} 