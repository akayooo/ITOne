import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendIcon, MicIcon, XIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function BpmnChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Здравствуйте! Это демо-версия чата для создания BPMN диаграмм. Сейчас работает только интерфейс без подключения к backend.',
      timestamp: new Date()
    }
  ])
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

  // Demo response function
  const addDemoResponse = () => {
    setTimeout(() => {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Это демо-версия. Backend функционал в разработке. Спасибо за тестирование!',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, newMessage])
    }, 1000)
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (input.trim() === '') return
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    
    // Add demo response
    addDemoResponse()
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
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
        ))}
        
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
            placeholder="Напишите сообщение..."
            className="flex-1"
          />
          <Button 
            type="button" 
            size="icon" 
            variant={isRecording ? "destructive" : "outline"}
            onClick={toggleRecording}
          >
            {isRecording ? <XIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
          </Button>
          <Button type="submit" size="icon">
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
        <div className="mt-2 text-xs text-muted-foreground">
          Это демо-версия чата. Напишите сообщение или используйте голосовой ввод.
        </div>
      </div>
    </div>
  )
} 