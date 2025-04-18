import { useEffect, useRef } from "react"
import BpmnModeler from "bpmn-js/lib/Modeler"
import { useBpmnStore } from "@/store/bpmn-store"
import { Button } from "@/components/ui/button"
import { RefreshCw, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import "bpmn-js/dist/assets/diagram-js.css"
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css"

export function BpmnEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { diagram, setModeler, resetDiagram, saveDiagram } = useBpmnStore()
  const { toast } = useToast()

  useEffect(() => {
    if (!containerRef.current) return

    const bpmnModeler = new BpmnModeler({
      container: containerRef.current,
      keyboard: {
        bindTo: window
      }
    })

    setModeler(bpmnModeler)

    // Import diagram
    bpmnModeler.importXML(diagram)
      .catch((error: Error) => {
        toast({
          title: "Error",
          description: `Could not load diagram: ${error.message}`,
          variant: "destructive"
        })
      })

    return () => {
      bpmnModeler.destroy()
    }
  }, []) // Only on mount

  const handleSave = async () => {
    try {
      const xml = await saveDiagram()
      toast({
        title: "Success",
        description: "Diagram saved successfully"
      })
      console.log(xml) // We would typically send this to a server
    } catch (error) {
      // Error is handled in saveDiagram already
    }
  }

  const handleReset = () => {
    resetDiagram()
    toast({
      title: "Info",
      description: "Diagram has been reset"
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">BPMN Editor</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      <div 
        ref={containerRef} 
        className="bpmn-container flex-1 w-full"
        style={{ height: "100%" }}
      />
    </div>
  )
} 