import { useState, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendIcon, MicIcon, XIcon, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ChatHistoryEntry, chatApi } from "@/lib/api"
import { useAuthStore } from "@/lib/auth"

// Add TypeScript declaration for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function BpmnChat() {
  const location = useLocation()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [speechStatus, setSpeechStatus] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // Get chat ID from URL
  const params = new URLSearchParams(location.search)
  const chatId = params.get('chatId') ? parseInt(params.get('chatId')!) : null
  
  // Load chat history when chat ID changes
  useEffect(() => {
    if (chatId) {
      loadChatHistory(chatId)
    } else {
      // Clear messages if no chat is selected
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'Выберите существующий чат или создайте новый с помощью кнопки "+" в боковой панели.',
          timestamp: new Date()
        }
      ])
    }
  }, [chatId])
  
  // Load chat history
  const loadChatHistory = async (chatId: number) => {
    if (!chatId || !user?.id) return
    
    setIsLoadingHistory(true)
    try {
      const history = await chatApi.getChatHistory(chatId)
      
      // Convert history to messages format
      const formattedMessages = history.map(entry => [
        {
          id: `user-${entry.id}`,
          role: 'user' as const,
          content: entry.message,
          timestamp: new Date(entry.created_at)
        },
        {
          id: `assistant-${entry.id}`,
          role: 'assistant' as const,
          content: entry.response,
          timestamp: new Date(entry.created_at)
        }
      ]).flat()
      
      // Sort by timestamp (oldest first)
      formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      
      setMessages(formattedMessages)
    } catch (error) {
      console.error("Failed to load chat history:", error)
      setMessages([
        {
          id: 'error',
          role: 'assistant',
          content: 'Не удалось загрузить историю чата.',
          timestamp: new Date()
        }
      ])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (input.trim() === '' || !chatId || !user?.id) return
    
    // Add user message to UI immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      // Demo response (replace with real API call)
      const response = "Это демо-версия. Backend функционал в разработке. Спасибо за тестирование!"
      
      // Add assistant message to UI
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Save the message exchange to the database
      await chatApi.saveChatEntry({
        user_id: user.id,
        chat_id: chatId,
        message: input.trim(),
        response: response
      })
    } catch (error) {
      console.error("Error processing message:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обработать сообщение",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Speech to text functions
  const startRecording = async () => {
    try {
      // Connect to WebSocket
      wsRef.current = new WebSocket('ws://localhost:8080/ws')
      
      wsRef.current.onopen = async () => {
        setSpeechStatus('Подключено. Запрашиваем доступ к микрофону...')
        
        try {
          // Получаем доступ к микрофону
          streamRef.current = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          })
          
          // Создаем аудио контекст
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 48000
          })
          
          // Создаем источник из медиа-потока
          microphoneRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current)
          
          // Создаем processor node для обработки аудио
          const CHUNK_SIZE = 4096
          processorRef.current = audioContextRef.current.createScriptProcessor(CHUNK_SIZE, 1, 1)
          
          processorRef.current.onaudioprocess = (e) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              // Получаем данные из буфера
              const inputData = e.inputBuffer.getChannelData(0)
              
              // Конвертируем float32 [-1.0,1.0] в int16 [-32768,32767]
              const intData = new Int16Array(inputData.length)
              for (let i = 0; i < inputData.length; i++) {
                // Клиппинг для безопасной конвертации
                const s = Math.max(-1, Math.min(1, inputData[i]))
                intData[i] = s < 0 ? s * 32768 : s * 32767
              }
              
              // Отправляем данные на сервер
              wsRef.current.send(intData.buffer)
            }
          }
          
          // Соединяем microphone -> processor -> destination
          microphoneRef.current.connect(processorRef.current)
          processorRef.current.connect(audioContextRef.current.destination)
          
          setSpeechStatus('Идет запись...')
          setIsRecording(true)
        } catch (err) {
          setSpeechStatus('')
          toast({
            title: "Ошибка доступа к микрофону",
            description: err instanceof Error ? err.message : "Неизвестная ошибка",
            variant: "destructive"
          })
          wsRef.current?.close()
        }
      }
      
      wsRef.current.onmessage = event => {
        const text = event.data
        setInput(prev => prev + (prev ? ' ' : '') + text)
      }
      
      wsRef.current.onerror = error => {
        console.error('WebSocket error:', error)
        setSpeechStatus('')
        toast({
          title: "Ошибка WebSocket соединения",
          variant: "destructive"
        })
      }
      
      wsRef.current.onclose = () => {
        setSpeechStatus('')
        if (isRecording) {
          stopRecording()
        }
      }
    } catch (err) {
      setSpeechStatus('')
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Неизвестная ошибка",
        variant: "destructive"
      })
    }
  }

  const stopRecording = () => {
    // Stop all audio processes
    if (processorRef.current && microphoneRef.current) {
      processorRef.current.disconnect()
      microphoneRef.current.disconnect()
      processorRef.current = null
      microphoneRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setSpeechStatus('')
    setIsRecording(false)
  }

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check if current user can interact with this chat
  const canInteract = Boolean(chatId && user?.id)

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length > 0 ? (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {!chatId ? 'Выберите чат' : 'Нет сообщений'}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input form */}
      <div className="border-t p-4">
        {speechStatus && (
          <div className="text-sm text-primary mb-2 flex items-center">
            <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
            {speechStatus}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canInteract ? "Введите сообщение..." : "Выберите чат для начала общения"}
            className="flex-1"
            disabled={!canInteract || isLoading}
          />
          
          <Button 
            type="button" 
            size="icon"
            variant="outline"
            onClick={toggleRecording}
            disabled={!canInteract || isLoading}
            className={isRecording ? 'bg-red-100 hover:bg-red-200 text-red-500' : ''}
          >
            {isRecording ? <XIcon className="h-5 w-5" /> : <MicIcon className="h-5 w-5" />}
          </Button>
          
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || !canInteract || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
} 