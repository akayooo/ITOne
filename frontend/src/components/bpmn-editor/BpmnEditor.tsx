import React, { useEffect, useRef, useState } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import { Button } from "@/components/ui/button";
import { Download, Save, Undo, Redo, ZoomIn, ZoomOut, Maximize, Minimize, RefreshCw, Image, FileText, Share2, Lightbulb } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { chatApi } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

// RecommendationsPanel component
interface RecommendationPanelProps {
  piperflowText: string;
  currentProcess: string;
  onApplyRecommendations: (recommendations: string) => void;
}

function RecommendationsPanel({ piperflowText, currentProcess, onApplyRecommendations }: RecommendationPanelProps) {
  const [recommendations, setRecommendations] = useState<string>("");
  const [recommendationItems, setRecommendationItems] = useState<{id: number, text: string, selected: boolean}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const recsText = await chatApi.generateRecommendations(piperflowText, currentProcess);
      setRecommendations(recsText);
      
      // Split recommendations into separate items
      const items = recsText.split(/\d+\./)
        .filter(item => item.trim().length > 0)
        .map((item, index) => ({
          id: index,
          text: item.trim(),
          selected: true
        }));
      
      setRecommendationItems(items);
      setIsOpen(true);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      let errorMessage = 'Не удалось получить рекомендации';
      
      // Проверяем на ошибки CORS
      if (err.message && (
          err.message.includes('CORS') || 
          err.message.includes('Cross-Origin') ||
          err.message.includes('Network Error')
        )) {
        errorMessage = 'Ошибка доступа к серверу рекомендаций. Проверьте, что CORS разрешен на порту 7777.';
      }
      
      setError(errorMessage);
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecommendation = (id: number) => {
    setRecommendationItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const applySelectedRecommendations = () => {
    const selectedRecs = recommendationItems
      .filter(item => item.selected)
      .map((item, index) => `${index + 1}. ${item.text}`)
      .join('\n');
    
    if (selectedRecs) {
      onApplyRecommendations(selectedRecs);
      toast({
        title: "Рекомендации применены",
        description: "Выбранные рекомендации будут применены к диаграмме"
      });
    } else {
      toast({
        title: "Внимание",
        description: "Не выбрано ни одной рекомендации",
        variant: "warning"
      });
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      {!isOpen ? (
        <div className="flex justify-center mb-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  className="rounded-full" 
                  size="icon"
                  onClick={fetchRecommendations}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Lightbulb className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Получить рекомендации по улучшению диаграммы</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : (
        <div className="bg-background/95 backdrop-blur-sm border-t shadow-lg p-4 transition-all">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Рекомендации по улучшению диаграммы
            </h3>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Скрыть
            </Button>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto pr-2 mb-4">
            {recommendationItems.length > 0 ? (
              <div className="space-y-3">
                {recommendationItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.selected ? 'border-primary/30 bg-primary/5' : 'border-muted bg-background'
                    }`}
                  >
                    <Checkbox 
                      id={`rec-${item.id}`} 
                      checked={item.selected}
                      onCheckedChange={() => toggleRecommendation(item.id)}
                      className="mt-1"
                    />
                    <label 
                      htmlFor={`rec-${item.id}`} 
                      className="text-sm flex-1 cursor-pointer"
                    >
                      {item.text}
                    </label>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-destructive p-3 border border-destructive/20 rounded-lg bg-destructive/5">
                {error}
              </div>
            ) : (
              <div className="flex justify-center p-4">
                <span className="text-muted-foreground">Загрузка рекомендаций...</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                {recommendationItems.filter(item => item.selected).length} из {recommendationItems.length} выбрано
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setRecommendationItems(items => items.map(item => ({ ...item, selected: true })))}
              >
                Выбрать все
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setRecommendationItems(items => items.map(item => ({ ...item, selected: false })))}
              >
                Сбросить все
              </Button>
              <Button 
                variant="default" 
                onClick={applySelectedRecommendations} 
                disabled={recommendationItems.filter(item => item.selected).length === 0}
              >
                Применить выбранные
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BpmnEditorProps {
  initialDiagram?: string;
  readOnly?: boolean;
  onSave?: (xml: string) => void;
  fallbackImage?: string | null;
  piperflowText?: string;
}

export function BpmnEditor({ 
  initialDiagram, 
  readOnly = false, 
  onSave,
  fallbackImage,
  piperflowText = ""
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

  const exportAsImage = async () => {
    if (!modelerRef.current) return;
    
    try {
      const canvas = modelerRef.current.get('canvas');
      const viewport = canvas.viewbox();
      
      // Create a temporary canvas with the current viewport
      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');
      
      // Set canvas size to viewport
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;
      
      // Get SVG element
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) throw new Error('SVG element not found');
      
      // Convert SVG to string
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create image from SVG
      const img = new globalThis.Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
        // Convert to PNG
        const pngUrl = tempCanvas.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'diagram.png';
        link.href = pngUrl;
        link.click();
        
        // Cleanup
        URL.revokeObjectURL(url);
      };
      img.src = url;
      
      toast({
        title: "Экспорт изображения",
        description: "Диаграмма успешно экспортирована как изображение"
      });
    } catch (err) {
      console.error('Error exporting as image:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать изображение",
        variant: "destructive"
      });
    }
  };

  const exportAsPiperFlow = async () => {
    if (!modelerRef.current) return;
    
    try {
      const result = await modelerRef.current.saveXML({ format: true });
      const xml = result.xml;
      
      // Convert BPMN XML to PiperFlow format
      // This is a placeholder - implement actual conversion logic
      const piperFlowText = `# PiperFlow Text Format\n${new Date().toISOString()}\n\n# Converted from BPMN\n`;
      
      // Create blob and download
      const blob = new Blob([piperFlowText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'diagram.piperflow';
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Экспорт PiperFlow",
        description: "Диаграмма успешно экспортирована в формат PiperFlow"
      });
    } catch (err) {
      console.error('Error exporting as PiperFlow:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать в формат PiperFlow",
        variant: "destructive"
      });
    }
  };

  const exportAsBpmn = async () => {
    if (!modelerRef.current) return;
    
    try {
      const result = await modelerRef.current.saveXML({ format: true });
      const xml = result.xml;
      
      // Create blob and download
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'diagram.bpmn';
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Экспорт BPMN",
        description: "Диаграмма успешно экспортирована в формат BPMN"
      });
    } catch (err) {
      console.error('Error exporting as BPMN:', err);
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать в формат BPMN",
        variant: "destructive"
      });
    }
  };

  // Render diagram container with loading state
  return (
    <div className={`relative h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="mt-4 text-muted-foreground">Загрузка редактора...</span>
          </div>
        </div>
      )}
      
      {error && !useFallbackImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="max-w-md p-6 bg-card shadow-lg rounded-lg border">
            <h3 className="text-lg font-semibold text-destructive mb-2">Ошибка загрузки редактора</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={importDiagram}>Попробовать снова</Button>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2 bg-background/70 backdrop-blur-sm p-2 rounded-lg shadow-sm">
        <Button variant="outline" size="icon" onClick={undo} title="Отменить">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={redo} title="Повторить">
          <Redo className="h-4 w-4" />
        </Button>
        <div className="h-6 border-l mx-1"></div>
        <Button variant="outline" size="icon" onClick={zoomIn} title="Увеличить">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={zoomOut} title="Уменьшить">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={resetZoom} title="Масштаб по размеру">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <div className="h-6 border-l mx-1"></div>
        <Button variant="outline" size="icon" onClick={toggleFullscreen} title="Полноэкранный режим">
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
        <div className="h-6 border-l mx-1"></div>
        <Button variant="outline" size="icon" onClick={exportAsImage} title="Экспорт как изображение">
          <Image className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={exportAsBpmn} title="Экспорт BPMN">
          <FileText className="h-4 w-4" />
        </Button>
        {!readOnly && (
          <Button variant="outline" size="icon" onClick={saveDiagram} title="Сохранить">
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {useFallbackImage && fallbackImage ? (
        <div className="h-full flex flex-col items-center justify-center p-4">
          <p className="mb-4 text-muted-foreground">
            Используется статическое изображение, так как не удалось загрузить редактор:
          </p>
          <img 
            src={fallbackImage} 
            alt="BPMN diagram" 
            className="max-w-full max-h-[80vh] object-contain border rounded-lg shadow-sm" 
          />
        </div>
      ) : (
        <div ref={containerRef} className="h-full" />
      )}
      
      {!useFallbackImage && piperflowText && (
        <RecommendationsPanel 
          piperflowText={piperflowText}
          currentProcess="Текущий бизнес-процесс"
          onApplyRecommendations={(recs) => {
            toast({
              title: "Рекомендации будут применены",
              description: "Диаграмма будет обновлена согласно рекомендациям"
            });
            
            // Here you would call the API to update the diagram with recommendations
            console.log("Applying recommendations:", recs);
          }}
        />
      )}
    </div>
  );
} 