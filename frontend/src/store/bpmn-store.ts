import { create } from "zustand"

// Default empty BPMN diagram
const DEFAULT_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="182" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

interface BpmnState {
  diagram: string
  modeler: any | null
  isLoading: boolean
  error: string | null
  setDiagram: (xml: string) => void
  setModeler: (modeler: any) => void
  resetDiagram: () => void
  saveDiagram: () => Promise<string>
}

export const useBpmnStore = create<BpmnState>((set, get) => ({
  diagram: DEFAULT_DIAGRAM,
  modeler: null,
  isLoading: false,
  error: null,
  
  setDiagram: (xml) => {
    set({ diagram: xml })
  },
  
  setModeler: (modeler) => {
    set({ modeler })
  },
  
  resetDiagram: () => {
    set({ diagram: DEFAULT_DIAGRAM })
    const { modeler } = get()
    if (modeler) {
      modeler.importXML(DEFAULT_DIAGRAM)
    }
  },
  
  saveDiagram: async () => {
    set({ isLoading: true, error: null })
    const { modeler } = get()
    
    try {
      if (!modeler) {
        throw new Error("BPMN modeler not initialized")
      }
      
      const { xml } = await modeler.saveXML({ format: true })
      set({ diagram: xml, isLoading: false })
      return xml
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to save diagram",
        isLoading: false
      })
      throw error
    }
  }
})) 