import { useState } from "react"
import { useChatStore } from "@/store/chat-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { formatDate } from "@/lib/utils"

export function ChatInterface() {
  const { 
    messages, 
    currentMessage, 
    setCurrentMessage, 
    sendMessage, 
    isLoading 
  } = useChatStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentMessage.trim()) return
    
    // For demo purposes, we'll just echo the message
    // In a real app, this would call an AI model API
    const demoResponse = `You sent: "${currentMessage}"\n\nThis is a demo response from the bot. In a real application, this would connect to an AI model that could help with your BPMN diagram.`
    
    await sendMessage(currentMessage, demoResponse)
  }

  return (
    <div className="flex flex-col h-full border rounded-md overflow-hidden bg-background">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions about your BPMN diagram
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-4">
                <div className="flex flex-col">
                  <div className="bg-accent p-3 rounded-lg">
                    <div className="font-medium text-sm text-accent-foreground">
                      You
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">
                      {message.content || message.message}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatDate(message.timestamp || message.created_at || new Date().toString())}
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <div className="font-medium text-sm text-primary">
                      AI Assistant
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">
                      {message.response || "No response yet"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <form 
        onSubmit={handleSubmit}
        className="p-4 border-t flex items-center gap-2"
      >
        <Input
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isLoading || !currentMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
} 