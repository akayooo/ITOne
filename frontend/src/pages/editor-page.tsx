import { useEffect } from "react"
import { BpmnEditor } from "@/components/bpmn/bpmn-editor"
import { ChatInterface } from "@/components/chat/chat-interface"
import { useChatStore } from "@/store/chat-store"

export function EditorPage() {
  const { loadChatHistory } = useChatStore()
  
  useEffect(() => {
    loadChatHistory()
  }, [loadChatHistory])

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">BPMN Editor with AI Assistant</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <div className="lg:col-span-2 border rounded-md overflow-hidden h-full">
          <BpmnEditor />
        </div>
        
        <div className="h-full">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
} 