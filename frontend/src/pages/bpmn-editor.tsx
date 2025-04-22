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
        
        // Использовать более надежный BPMN XML
        const defaultDiagram = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_${Date.now()}"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
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
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="159" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="185" y="202" width="25" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="270" y="137" width="100" height="80" />
        <bpmndi:BPMNLabel />
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
        
        try {
          // Attempt to convert from PiperFlow
          const xml = convertPiperflowToBpmn(decodedText);
          console.log('Generated BPMN XML:', xml.substring(0, 200) + '...');
          
          // Validate XML structure
          if (!validateXML(xml)) {
            console.warn('Generated XML is not valid, using default diagram');
            setBpmnXml(defaultDiagram);
          } else {
            setBpmnXml(xml);
          }
          
          // Extract title from PiperFlow
          const titleMatch = decodedText.match(/title:\s*(.+)/);
          if (titleMatch && titleMatch[1]) {
            setDiagramTitle(titleMatch[1].trim());
          }
        } catch (err) {
          console.error("Error converting PiperFlow to BPMN:", err);
          setBpmnXml(defaultDiagram);
        }
      } catch (err) {
        console.error("Error decoding PiperFlow:", err);
        
        // Предоставляем временную диаграмму для отладки
        const defaultPiperflow = `title: Процесс заказа в интернет-магазине
colourtheme: BLUEMOUNTAIN

pool: Интернет-магазин
    lane: Система
        (start) as start_event
        [Получение заказа] as receive_order
        [Обработка заказа] as process_order
        [Подтверждение оплаты] as confirm_payment
        start_event -> receive_order -> process_order -> confirm_payment

pool: Склад
    lane: Кладовщик
        [Комплектация заказа] as pack_order
        [Передача в доставку] as hand_to_delivery
        confirm_payment -> pack_order -> hand_to_delivery

pool: Доставка
    lane: Курьер
        [Доставка клиенту] as deliver
        [Получение оплаты] as receive_payment
        (end) as end_event
        
        hand_to_delivery -> deliver -> receive_payment -> end_event

footer: Временная тестовая диаграмма`;

        setBpmnXml(convertPiperflowToBpmn(defaultPiperflow));
        setDiagramTitle("Тестовая BPMN диаграмма");
        
        toast({
          title: "Используется тестовая диаграмма",
          description: "Не удалось преобразовать PiperFlow в BPMN диаграмму. Загружена тестовая диаграмма.",
          variant: "destructive"
        });
      }
    } else {
      console.log('No PiperFlow text received');
      
      // Загрузим тестовую диаграмму если ничего не получено
      const defaultPiperflow = `title: Пустая диаграмма
colourtheme: BLUEMOUNTAIN

pool: Процесс
    lane: Участник
        (start) as start_event
        [Действие 1] as task1
        [Действие 2] as task2
        (end) as end_event
        
        start_event -> task1 -> task2 -> end_event

footer: Тестовая диаграмма`;

      setBpmnXml(convertPiperflowToBpmn(defaultPiperflow));
    }
    
    console.log('URL Parameters:', {
      diagramId,
      imageExists: !!imageData,
      piperflowExists: !!piperflowText
    });
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
          />
        ) : imageData ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            {bpmnXml ? (
              <p className="mb-4 text-muted-foreground">
                Отображается статичная версия диаграммы
              </p>
            ) : (
              <p className="mb-4 text-muted-foreground">
                Интерактивный редактор BPMN недоступен для этой диаграммы. Отображается статичная версия:
              </p>
            )}
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