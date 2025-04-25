import React, { useEffect, useRef, useState } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import { Button } from "@/components/ui/button";
import { Save, Undo, Redo, ZoomIn, ZoomOut, Maximize, Minimize, RefreshCw, FileText, Lightbulb, CheckSquare, XSquare, Check, ListChecks, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { chatApi } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { convertPiperflowToBpmn } from "@/lib/bpmn-service";

// Добавляем CSS для скрытия логотипа BPMN.io
import './bpmn-editor.css';

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

function RecommendationsPanel({ piperflowText, currentProcess, onApplyRecommendations, initialRecommendations }: RecommendationPanelProps & { initialRecommendations?: string }) {
  const [recommendations, setRecommendations] = useState<string>(initialRecommendations || "");
  const [recommendationItems, setRecommendationItems] = useState<{id: number, text: string, selected: boolean}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Меняем стандартное состояние на скрытое
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Добавляем отладочные логи
  useEffect(() => {
    console.log("RecommendationsPanel mounted");
    console.log("initialRecommendations:", initialRecommendations);
    console.log("piperflowText length:", piperflowText?.length || 0);
    
    // Process initial recommendations if available
    if (initialRecommendations) {
      console.log("Processing initial recommendations");
      processRecommendations(initialRecommendations);
    } else if (piperflowText && piperflowText.length > 0) {
      console.log("No initial recommendations, but piperflow available - fetching from API");
      // Автоматически получаем рекомендации, если их нет
      fetchRecommendations();
    }
  }, []);
  
  // When piperflow changes, we might need to update recommendations
  useEffect(() => {
    if (piperflowText && piperflowText.length > 0 && !recommendations && !isLoading) {
      console.log("PiperFlow changed, fetching new recommendations");
      fetchRecommendations();
    }
  }, [piperflowText]);

  // Выделяем обработку рекомендаций в отдельную функцию
  const processRecommendations = (recsText: string) => {
    console.log("Processing recommendations text:", recsText);
    
    if (!recsText || recsText.trim().length === 0) {
      console.warn("Empty recommendations text provided");
      setRecommendationItems([]);
      return;
    }
    
    // Try to split by numbered items pattern
    try {
      // Split recommendations into separate items
      const items = recsText.split(/\d+\./)
        .filter(item => item.trim().length > 0)
        .map((item, index) => ({
          id: index,
          text: item.trim(),
          selected: true
        }));
      
      if (items.length === 0) {
        // If regular splitting didn't work, try line by line
        const lineItems = recsText.split('\n')
          .filter(line => line.trim().length > 0)
          .map((line, index) => ({
            id: index,
            text: line.trim(),
            selected: true
          }));
        
        console.log("Using line-by-line parsing for recommendations, found:", lineItems.length);
        setRecommendationItems(lineItems);
      } else {
        console.log("Parsed recommendation items:", items.length);
        setRecommendationItems(items);
      }
      
      setRecommendations(recsText);
    } catch (err) {
      console.error("Error processing recommendations:", err);
      // Fallback - treat the whole text as one recommendation
      setRecommendationItems([{
        id: 0,
        text: recsText.trim(),
        selected: true
      }]);
      setRecommendations(recsText);
    }
  };

  const fetchRecommendations = async () => {
    // Если рекомендации уже есть, используем их
    if (recommendations && recommendations.length > 0) {
      console.log("Already have recommendations, using existing ones");
      setIsOpen(true);
      return;
    }
    
    // Проверяем, есть ли текст для генерации рекомендаций
    if (!piperflowText || piperflowText.length === 0) {
      console.warn("No piperflow text available for recommendations");
      setError("Нет данных для генерации рекомендаций");
      return;
    }

    console.log("Fetching recommendations from API");
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Calling API with piperflow text length:", piperflowText.length);
      const recsText = await chatApi.generateRecommendations(
        piperflowText, 
        currentProcess || "Current process"
      );
      
      console.log("Received recommendations, length:", recsText?.length || 0);
      
      if (!recsText || recsText.trim().length === 0) {
        setError("Получены пустые рекомендации");
        setIsLoading(false);
        return;
      }
      
      // Обрабатываем полученные рекомендации
      processRecommendations(recsText);
      setIsOpen(true);
    } catch (err: any) {
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
    
    if (selectedRecs && selectedRecs.trim().length > 0) {
      setIsLoading(true);
      
      console.log("Applying recommendations:", selectedRecs);
      console.log("PiperFlow length:", piperflowText?.length || 0);
      
      chatApi.applyRecommendations(piperflowText, selectedRecs)
        .then(result => {
          if (result.success && result.updated_piperflow) {
            console.log("Successfully applied recommendations");
            console.log("Updated piperflow length:", result.updated_piperflow.length);
            
            // Pass the updated piperflow to the parent component
            onApplyRecommendations(result.updated_piperflow);
            
            toast({
              title: "Рекомендации применены",
              description: "Выбранные рекомендации успешно применены к диаграмме"
            });
            
            // Close the panel after successful application
            setIsOpen(false);
          } else {
            throw new Error(result.error || "Не удалось применить рекомендации");
          }
        })
        .catch(err => {
          console.error("Error applying recommendations:", err);
          toast({
            title: "Ошибка",
            description: err.message || "Произошла ошибка при применении рекомендаций",
            variant: "destructive"
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      toast({
        title: "Внимание",
        description: "Не выбрано ни одной рекомендации",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="absolute right-6 bottom-6 z-40" style={{ maxWidth: isOpen ? "500px" : "auto" }}>
      {!isOpen ? (
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  className="rounded-full shadow-md aspect-square p-0" 
                  style={{ width: "48px", height: "48px" }}
                  onClick={() => {
                    // Открываем панель при клике
                    setIsOpen(true);
                    // И загружаем рекомендации, если их еще нет
                    if (!recommendations) {
                      fetchRecommendations();
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-7 w-7 animate-spin" />
                  ) : (
                    <Lightbulb className="h-7 w-7" />
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
        <div className="recommendations-panel-slide-up rounded-lg border overflow-hidden bg-background shadow-lg">
          <div className="flex justify-between items-center p-3 border-b bg-muted/50">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Рекомендации
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="close-btn">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4 max-h-[300px] overflow-y-auto">
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
          
          <div className="flex justify-between items-center p-3 border-t bg-muted/50">
            <div className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                {recommendationItems.filter(item => item.selected).length} из {recommendationItems.length} выбрано
              </Badge>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        const allSelected = recommendationItems.every(item => item.selected);
                        setRecommendationItems(items => 
                          items.map(item => ({ ...item, selected: !allSelected }))
                        );
                      }}
                      className="select-btn recommendations-btn"
                    >
                      {recommendationItems.every(item => item.selected) 
                        ? <XSquare className="h-4 w-4" /> 
                        : <ListChecks className="h-4 w-4" />
                      }
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {recommendationItems.every(item => item.selected) 
                      ? <p>Сбросить все</p> 
                      : <p>Выбрать все</p>
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="default" 
                      size="icon"
                      onClick={applySelectedRecommendations} 
                      disabled={recommendationItems.filter(item => item.selected).length === 0}
                      className="apply-btn recommendations-btn"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Применить выбранные</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
  piperflowText?: string;
  initialRecommendations?: string;
}

export function BpmnEditor({ 
  initialDiagram, 
  readOnly = false, 
  onSave,
  piperflowText = "",
  initialRecommendations
}: BpmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();
  const [xml, setXml] = useState<string>(initialDiagram || EMPTY_DIAGRAM);
  const [scale, setScale] = useState(1);
  const [currentProcess, setCurrentProcess] = useState(extractProcessDescription(piperflowText));
  const [currentPiperflowText, setPiperflowText] = useState(piperflowText);
  
  // Тестовые рекомендации для отладки (если настоящие недоступны)
  const testRecommendations = "1. Рекомендуется разделить большие блоки на более мелкие для улучшения читаемости.\n2. Добавьте более подробные описания к действиям.\n3. Используйте цветовые обозначения для разделения функциональных блоков.";
  
  // State for recommendations
  const [hasAutoRecommendations, setHasAutoRecommendations] = useState(!!initialRecommendations);
  
  // Добавим отладочные логи
  useEffect(() => {
    console.log("BpmnEditor Component Props:", {
      hasInitialDiagram: !!initialDiagram,
      readOnly,
      piperflowTextLength: piperflowText?.length || 0,
      initialRecommendations: initialRecommendations || "none"
    });
  }, [initialDiagram, readOnly, piperflowText, initialRecommendations]);
  
  // Extract process description from PiperFlow
  function extractProcessDescription(text: string): string {
    // Extract title from PiperFlow
    const titleMatch = text.match(/title:\s*(.+)/);
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : "";
    
    // Extract footer from PiperFlow (if exists)
    const footerMatch = text.match(/footer:\s*(.+)/);
    const footer = footerMatch && footerMatch[1] ? footerMatch[1].trim() : "";
    
    return `${title}${footer ? `: ${footer}` : ""}`;
  }

  // Initial setup effects
  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log('BpmnEditor: Initializing modeler');
    try {
      const container = containerRef.current;
      
      // Create modeler
      const modeler = new BpmnModeler({
        container,
        keyboard: { bindTo: container },
        // Улучшение отображения
        additionalModules: [
          // Можно добавить дополнительные модули здесь
        ],
        // Параметры отображения
        canvas: {
          deferUpdate: false
        }
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
        importDiagram(initialDiagram || EMPTY_DIAGRAM);
      }, 100);
    } catch (err) {
      console.error('Error initializing BPMN modeler:', err);
      setError('Failed to initialize diagram editor');
      setIsLoading(false);
    }

    // Set up window resize listener
    window.addEventListener('resize', updateSize);
    updateSize();
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('resize', updateSize);
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

  const importDiagram = (xmlToImport: string = EMPTY_DIAGRAM) => {
    if (!modelerRef.current) {
      console.warn('Modeler not initialized');
      setError('Editor not initialized properly');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('BpmnEditor: Importing diagram');
      
      modelerRef.current.importXML(xmlToImport)
        .then(({ warnings }: { warnings: any[] }) => {
          if (warnings && warnings.length) {
            console.warn('Warnings while importing BPMN:', warnings);
          }
          
          try {
            const canvas = modelerRef.current?.get('canvas') as any;
            if (canvas) {
              // Подождать больше времени перед масштабированием для гарантии загрузки
              setTimeout(() => {
                // Увеличиваем отступы для видимости всех элементов
                canvas.viewbox({
                  x: 0,
                  y: 0,
                  width: 1600,
                  height: 800
                });
                
                // Подождем еще немного и выполним масштабирование
                setTimeout(() => {
                  // Fit diagram to viewport с дополнительным отступом
                  canvas.zoom('fit-viewport', 'auto');
                  
                  // Уменьшаем масштаб на 20% для обеспечения дополнительного пространства
                  const currentZoom = canvas.zoom();
                  canvas.zoom(currentZoom * 0.8);
                  
                  // Центрируем диаграмму
                  const viewbox = canvas.viewbox();
                  canvas.viewbox({
                    x: viewbox.x - 20,
                    y: viewbox.y - 20,
                    width: viewbox.width + 40,
                    height: viewbox.height + 40
                  });
                }, 100);
              }, 300);
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
        });
    } catch (err) {
      console.error('Exception during diagram import:', err);
      setError('Failed to process diagram');
      setIsLoading(false);
    }
  };

  // Обновляем функцию updateSize для лучшего отображения диаграмм
  const updateSize = () => {
    if (!modelerRef.current) return;
    
    try {
      const canvas = modelerRef.current.get('canvas') as any;
      if (canvas) {
        canvas.resized();
        
        // Небольшая задержка для корректного ресайза
        setTimeout(() => {
          // Получаем текущий viewbox для контроля
          const viewbox = canvas.viewbox();
          
          // Подгоняем под размер с гарантированными отступами
          canvas.zoom('fit-viewport', 'auto');
          
          // Уменьшаем масштаб на 20% для лучшего вида и предотвращения обрезки
          const currentZoom = canvas.zoom();
          canvas.zoom(currentZoom * 0.8);
          
          // Дополнительные отступы по краям
          const newViewbox = canvas.viewbox();
          canvas.viewbox({
            x: newViewbox.x - 20,
            y: newViewbox.y - 20,
            width: newViewbox.width + 40,
            height: newViewbox.height + 40
          });
        }, 200);
      }
    } catch (err) {
      console.warn('Error during resize:', err);
    }
  };

  // Handle container resize with более надежным методом
  useEffect(() => {
    if (!modelerRef.current || !containerRef.current) return;
  
    // Запускаем первичное обновление размера
    updateSize();
    
    // Создаем наблюдатель за изменением размера, если браузер поддерживает
    let resizeObserver: any = null;
    
    // Проверяем, поддерживает ли браузер ResizeObserver
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(debounce(() => {
        updateSize();
      }, 100));
      
      resizeObserver.observe(containerRef.current);
    } else {
      // Резервный вариант - используем обработчик события resize окна
      const handleResize = debounce(() => {
        updateSize();
      }, 100);
      
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Debounce функция для предотвращения слишком частых вызовов
  function debounce(func: Function, wait: number) {
    let timeout: any;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Function to save diagram
  const saveDiagram = () => {
    if (!modelerRef.current || !onSave) return;
    
    try {
      modelerRef.current.saveXML({ format: true })
        .then((result: any) => {
          const xml = result.xml;
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
      // Функция handleResize больше не используется, используем updateSize
      if (modelerRef.current) {
        try {
          const canvas = modelerRef.current.get('canvas') as any;
          if (canvas) {
            canvas.resized();
            
            // Ждем обновления размеров в полноэкранном режиме
            setTimeout(() => {
              // Сбрасываем текущие настройки viewbox для предотвращения странного поведения
              canvas.viewbox({
                x: 0,
                y: 0,
                width: 2000,
                height: 1000
              });
              
              // Затем подгоняем под размер окна
              setTimeout(() => {
                canvas.zoom('fit-viewport', 'auto');
                
                // Уменьшаем масштаб для лучшего вида и предотвращения обрезки
                const currentZoom = canvas.zoom();
                canvas.zoom(currentZoom * 0.7);
                
                // Добавляем отступы
                const viewbox = canvas.viewbox();
                canvas.viewbox({
                  x: viewbox.x - 40,
                  y: viewbox.y - 40,
                  width: viewbox.width + 80,
                  height: viewbox.height + 80
                });
              }, 200);
            }, 300);
          }
        } catch (err) {
          console.warn('Error during resize after fullscreen toggle:', err);
        }
      }
    }, 100);
  };

  const exportAsBpmn = async () => {
    if (!modelerRef.current) return;
    
    try {
      const result = await modelerRef.current.saveXML({ format: true });
      const xml = result.xml || '';
      
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

  // Handle recommendations being applied
  const handleApplyRecommendations = (updatedPiperflow: string) => {
    // Set the updated piperflow text
    setPiperflowText(updatedPiperflow);
    
    try {
      console.log("Applying updated piperflow, length:", updatedPiperflow?.length || 0);
      
      // Convert updated piperflow to BPMN XML
      const updatedXml = convertPiperflowToBpmn(updatedPiperflow);
      console.log("Generated XML, length:", updatedXml?.length || 0);
      
      // Update the diagram with the new XML
      importDiagram(updatedXml);
      
      toast({
        title: "Диаграмма обновлена",
        description: "Диаграмма успешно обновлена с учетом рекомендаций"
      });
    } catch (error) {
      console.error('Error updating diagram with recommendations:', error);
      
      // Fallback: Try to use the XML from the API response directly
      chatApi.generateBpmnDiagram("Обновить диаграмму с рекомендациями")
        .then(result => {
          if (result.success && result.text) {
            setPiperflowText(result.text);
            
            try {
              const xml = convertPiperflowToBpmn(result.text);
              importDiagram(xml);
              
              toast({
                title: "Диаграмма обновлена",
                description: "Диаграмма успешно обновлена с использованием API"
              });
            } catch (err) {
              console.error("Error converting piperflow from API:", err);
              toast({
                title: "Ошибка обновления",
                description: "Не удалось конвертировать piperflow из API",
                variant: "destructive"
              });
            }
          } else {
            throw new Error("API response did not contain valid piperflow");
          }
        })
        .catch(err => {
          console.error("Error in fallback diagram update:", err);
          toast({
            title: "Ошибка обновления",
            description: "Не удалось обновить диаграмму с новыми рекомендациями",
            variant: "destructive"
          });
        });
    }
  };

  // Extract process description from piperflow text
  useEffect(() => {
    if (piperflowText) {
      setCurrentProcess(extractProcessDescription(piperflowText));
      setPiperflowText(piperflowText);
    }
  }, [piperflowText]);

  // Render diagram container with loading state
  return (
    <div className={`relative h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-20 bg-background' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="mt-4 text-muted-foreground">Загрузка редактора...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="max-w-md p-6 bg-card shadow-lg rounded-lg border">
            <h3 className="text-lg font-semibold text-destructive mb-2">Ошибка загрузки редактора</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={importDiagram}>Попробовать снова</Button>
          </div>
        </div>
      )}
      
      {/* Toolbar fixed at the top */}
      <div className="flex-shrink-0 z-50 flex flex-wrap gap-2 bg-background/90 backdrop-blur-sm p-2 rounded-lg shadow-sm mb-2 bpmn-toolbar">
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
        <Button variant="outline" size="icon" onClick={exportAsBpmn} title="Экспорт BPMN">
          <FileText className="h-4 w-4" />
        </Button>
        {!readOnly && (
          <Button variant="outline" size="icon" onClick={saveDiagram} title="Сохранить">
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Diagram container as flex-grow */}
      <div className="flex-grow relative overflow-hidden">
        <div ref={containerRef} className="h-full w-full bpmn-container bpmn-content" />
      </div>
      
      <RecommendationsPanel 
        piperflowText={currentPiperflowText}
        currentProcess={currentProcess}
        onApplyRecommendations={handleApplyRecommendations}
        initialRecommendations={initialRecommendations}
      />
    </div>
  );
} 