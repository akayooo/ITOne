import { useState, useRef, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SendIcon, MicIcon, XIcon, Loader2, Copy, Check, Paperclip } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ChatHistoryEntry, chatApi } from "@/lib/api"
import { useAuthStore } from "@/lib/auth"
import { BpmnEditor } from "@/components/bpmn-editor/BpmnEditor"
import { convertPiperflowToBpmn } from "@/lib/bpmn-service"
import axios from 'axios'

// URL for the OCR backend service
const OCR_API_URL = 'http://localhost:8001/ocr';

// Add TypeScript declaration for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

interface Message {
  id: string
  historyId?: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isError?: boolean
  isLoading?: boolean
  isUploading?: boolean
  isResending?: boolean
  bpmnXml?: string
  piperflowText?: string
  recommendations?: string
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
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast()
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

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
          historyId: entry.id,
          role: 'assistant' as const,
          content: entry.response,
          timestamp: new Date(entry.created_at),
          bpmnXml: entry.piperflow_text ? convertPiperflowToBpmn(entry.piperflow_text) : undefined,
          piperflowText: entry.piperflow_text,
          recommendations: entry.recommendations
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
      // Определяем тип запроса с помощью нашей новой функции, которая теперь использует бэкенд
      const requestType = await chatApi.determineBpmnRequestType(input);
      console.log('Backend identified request type:', requestType);
      
      let response = '';
      let bpmnXml = '';
      let piperflowText = '';
      let recommendations: string | undefined;
      
      // Если запрос на добавление блока (TYPE_2), найдем предыдущую диаграмму
      if (requestType === 'TYPE_2') {
        console.log('Backend identified "add block" request (TYPE_2)');
        // Найти последнее сообщение с диаграммой в истории чата
        const lastBpmnMessage = [...messages].reverse().find(msg => 
          msg.piperflowText && msg.piperflowText.length > 0
        );
        
        if (lastBpmnMessage?.piperflowText) {
          console.log('Found previous diagram, sending modification request');
          
          try {
            // Отправляем запрос с предыдущей диаграммой и текущим запросом
            const bpmnResult = await chatApi.generateBpmnDiagram(input.trim(), undefined, lastBpmnMessage.piperflowText);
            
            if (bpmnResult.success && bpmnResult.text) {
              response = "Вот обновленная BPMN диаграмма с добавленными блоками:";
              
              // Save the PiperFlow text for the BPMN editor
              piperflowText = bpmnResult.text;
              
              // Сохраняем рекомендации, если они есть
              if (bpmnResult.recommendations) {
                recommendations = bpmnResult.recommendations;
              }
              
              try {
                bpmnXml = convertPiperflowToBpmn(bpmnResult.text);
              } catch (error) {
                console.error('Error converting PiperFlow to BPMN XML:', error);
              }
            } else {
              response = `Не удалось обновить BPMN диаграмму: ${bpmnResult.error || 'Неизвестная ошибка'}`;
              console.error('BPMN update failed:', bpmnResult.error);
            }
          } catch (error) {
            console.error('Error calling BPMN modification API:', error);
            response = "Ошибка при обновлении BPMN диаграммы. Пожалуйста, попробуйте еще раз.";
          }
        } else {
          response = "Не найдена предыдущая BPMN диаграмма для редактирования. Сначала создайте диаграмму.";
        }
      } 
      // Если запрос на редактирование (TYPE_3), найдем предыдущую диаграмму
      else if (requestType === 'TYPE_3') {
        console.log('Backend identified "edit diagram" request (TYPE_3)');
        // Найти последнее сообщение с диаграммой в истории чата
        const lastBpmnMessage = [...messages].reverse().find(msg => 
          msg.piperflowText && msg.piperflowText.length > 0
        );
        
        if (lastBpmnMessage?.piperflowText) {
          console.log('Found previous diagram, sending edit request');
          
          try {
            // Отправляем запрос с предыдущей диаграммой и текущим запросом
            const bpmnResult = await chatApi.generateBpmnDiagram(input.trim(), undefined, lastBpmnMessage.piperflowText);
            
            if (bpmnResult.success && bpmnResult.text) {
              response = "Вот отредактированная BPMN диаграмма:";
              
              // Save the PiperFlow text for the BPMN editor
              piperflowText = bpmnResult.text;
              
              // Сохраняем рекомендации, если они есть
              if (bpmnResult.recommendations) {
                recommendations = bpmnResult.recommendations;
              }
              
              try {
                bpmnXml = convertPiperflowToBpmn(bpmnResult.text);
              } catch (error) {
                console.error('Error converting PiperFlow to BPMN XML:', error);
              }
            } else {
              response = `Не удалось отредактировать BPMN диаграмму: ${bpmnResult.error || 'Неизвестная ошибка'}`;
              console.error('BPMN edit failed:', bpmnResult.error);
            }
          } catch (error) {
            console.error('Error calling BPMN edit API:', error);
            response = "Ошибка при редактировании BPMN диаграммы. Пожалуйста, попробуйте еще раз.";
          }
        } else {
          response = "Не найдена предыдущая BPMN диаграмма для редактирования. Сначала создайте диаграмму.";
        }
      }
      // Если запрос на создание новой диаграммы (TYPE_1)
      else if (requestType === 'TYPE_1') {
        console.log('Backend identified "create new diagram" request (TYPE_1)');
        
        try {
          console.log('Sending BPMN generation request for:', input.trim());
          const bpmnResult = await chatApi.generateBpmnDiagram(input.trim());
          console.log('BPMN result received:', bpmnResult);
          
          if (bpmnResult.success && bpmnResult.text) {
            response = "Вот созданная BPMN диаграмма на основе вашего описания:";
            
            // Save the PiperFlow text for the BPMN editor
            piperflowText = bpmnResult.text;
            console.log('PiperFlow text received from API:', piperflowText);
            
            // Сохраняем рекомендации, если они есть
            if (bpmnResult.recommendations) {
              console.log('Recommendations received:', bpmnResult.recommendations);
            }
            
            try {
              bpmnXml = convertPiperflowToBpmn(bpmnResult.text);
              console.log('BPMN XML converted successfully, length:', bpmnXml.length);
            } catch (convError) {
              console.error('Error converting PiperFlow to BPMN XML:', convError);
              toast({
                title: "Ошибка преобразования",
                description: "Не удалось преобразовать PiperFlow в BPMN диаграмму",
                variant: "destructive",
                duration: 3000
              });
            }
            
            // Используем рекомендации из полученного результата
            if (bpmnResult.recommendations) {
              recommendations = bpmnResult.recommendations;
            }
          } else {
            response = `Не удалось создать BPMN диаграмму: ${bpmnResult.error || 'Неизвестная ошибка'}`;
            console.error('BPMN generation failed:', bpmnResult.error);
          }
        } catch (error) {
          console.error('Error calling BPMN generation API:', error);
          response = "Ошибка при создании BPMN диаграммы. Пожалуйста, попробуйте еще раз.";
        }
      }
      // Не BPMN запрос или неизвестный тип
      else {
        response = "Ваш запрос не распознан как запрос на создание или редактирование BPMN диаграммы.";
      }
      
      // Add assistant message to chat history
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        bpmnXml: bpmnXml || undefined,
        piperflowText: piperflowText || undefined,
        recommendations: recommendations
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Save chat to database if we have a chatId
      if (chatId && user?.id) {
        try {
          // Save both user message and assistant response in database
          const savedEntry = await chatApi.saveChatEntry({
            user_id: user.id,
            chat_id: chatId,
            message: input,
            response: response,
            recommendations: recommendations,
            piperflow_text: piperflowText
          })
          
          console.log('Chat entry saved with ID:', savedEntry.id)
          
          // Update the assistantMessage with the database ID for future reference
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, historyId: savedEntry.id }
              : msg
          ))
        } catch (error) {
          console.error('Failed to save chat history:', error)
          toast({
            title: "Ошибка",
            description: "Не удалось сохранить историю чата",
            variant: "destructive",
            duration: 3000
          })
        }
      }
      
      // Если сообщений не было (первое сообщение в чате), обновляем название чата
      if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'assistant')) {
        try {
          // Обрезаем длинные сообщения для названия чата
          const maxLength = 30
          let chatName = input.trim()
          
          if (chatName.length > maxLength) {
            chatName = chatName.substring(0, maxLength) + '...'
          }
          
          // Обновляем название чата
          await chatApi.updateChat(chatId, { name: chatName })
          console.log("Chat name updated to first message:", chatName)
        } catch (error) {
          console.error("Error updating chat name:", error)
        }
      }
    } catch (error) {
      console.error("Error processing message:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обработать сообщение",
        variant: "destructive",
        duration: 3000
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
            variant: "destructive",
            duration: 3000
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
          variant: "destructive",
          duration: 3000
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
        variant: "destructive",
        duration: 3000
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

  // Function to copy message text to clipboard
  const copyMessageToClipboard = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedMessageId(messageId);
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy message:", err);
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать сообщение",
          variant: "destructive",
          duration: 3000
        });
      });
  };

  // Update the message rendering to include images and a copy button
  const renderMessage = (message: Message) => {
    // Проверяем на сообщение об ошибке связанной с нерелевантным запросом
    // Проверка как в тексте сообщения, так и в piperflow тексте
    const isNotBPMNRelatedError = 
      message.content.includes("Ваш запрос не относится к моей специализации") ||
      message.content.includes("задайте вопрос, касающийся BPMN-диаграмм") ||
      message.content.includes("запрос не относится к моей специализации") ||
      (message.piperflowText && (
        message.piperflowText.includes("Запрос не относится к моей специализации") ||
        message.piperflowText.includes("задайте вопрос, касающийся BPMN-диаграмм") ||
        message.piperflowText.includes("не относится к моей специализации")
      ));
    
    // Проверяем на сообщение "Я интерпретировал ваш запрос..." - для него тоже не показываем диаграмму
    const isGenericMisinterpretation = 
      message.content.includes("Я интерпретировал ваш запрос как просьбу создать BPMN диаграмму");
    
    // Объединенное условие - либо сообщение об ошибке, либо сообщение о неверной интерпретации
    const shouldHideEditor = isNotBPMNRelatedError || isGenericMisinterpretation;
    
    // Если это сообщение с ошибкой нерелевантности, показываем только сообщение об ошибке
    if (isNotBPMNRelatedError && message.role === 'assistant') {
      return (
        <div key={message.id} className="mb-4 text-left">
          <div className="inline-block max-w-[85%] rounded-xl px-4 py-3 bg-red-50 border border-red-200 text-red-600">
            {message.piperflowText && message.piperflowText.includes("Запрос не относится к моей специализации") 
              ? message.piperflowText 
              : "Запрос не относится к моей специализации. Пожалуйста, задайте вопрос, касающийся моделирования бизнес-процессов, BPMN диаграмм или библиотеки processpiper."}
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-left">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      );
    }
    
    return (
    <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
      <div 
        className={`${message.bpmnXml && !shouldHideEditor ? 'inline-block w-full max-w-full' : 'inline-block max-w-[85%]'} rounded-xl px-4 py-3 ${
          message.role === 'user' 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' 
            : 'bg-muted'
        }`}
      >
        <div className="flex items-start justify-between">
          <p className="whitespace-pre-wrap break-words flex-1">{message.content}</p>
          <Button
            variant="ghost"
            size="icon"
            className={`ml-2 h-7 w-7 flex-shrink-0 ${message.role === 'user' ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
            onClick={() => copyMessageToClipboard(message.id, message.content)}
            title="Скопировать сообщение"
          >
            {copiedMessageId === message.id ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {isGenericMisinterpretation && !isNotBPMNRelatedError ? (
          // Для сообщений "Я интерпретировал..." просто не показываем редактор
          null
        ) : message.bpmnXml && !shouldHideEditor ? (
          <div className="mt-4 w-full">
            <div className="rounded bg-white border shadow-sm overflow-hidden" 
                 style={{ 
                   height: '600px', 
                   width: '100%'
                 }}>
              <BpmnEditor 
                initialDiagram={message.bpmnXml} 
                readOnly={true}
                piperflowText={message.piperflowText}
                initialRecommendations={message.recommendations}
                chatEntryId={message.historyId}
              />
            </div>
            
            <div className="mt-2 flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <details className="cursor-pointer text-sm text-muted-foreground">
                  <summary className="font-medium">Показать PiperFlow текст</summary>
                  <pre className="mt-2 bg-muted p-2 rounded text-left overflow-auto text-xs">
                    {message.piperflowText}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className={`text-xs text-muted-foreground mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )};

  // --- OCR PDF Handling ---
  const handlePdfUploadClick = () => {
    fileInputRef.current?.click(); // Trigger hidden file input
  };

  const handlePdfFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      event.target.value = ''; // Reset file input

      if (file.type !== 'application/pdf') {
        setOcrError('Пожалуйста, выберите PDF файл.');
        toast({
          title: "Неверный тип файла",
          description: "Можно загружать только PDF файлы.",
          variant: "destructive",
        });
        return;
      }

      setIsOcrLoading(true);
      setOcrError(null);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post<{ text: string; pages: number }>(
          OCR_API_URL,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        // Insert extracted text into the input field
        setInput(prevInput => prevInput + response.data.text);
        toast({
          title: "Текст извлечен",
          description: `Текст из файла "${file.name}" добавлен в поле ввода.`,
        });

      } catch (err: any) {
        console.error('Error uploading or processing PDF file:', err);
        let errorMessage = 'Произошла ошибка при обработке PDF файла.';
        if (axios.isAxiosError(err) && err.response) {
          errorMessage = err.response.data?.detail || err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setOcrError(`Ошибка OCR: ${errorMessage}`);
        toast({
          title: "Ошибка OCR",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsOcrLoading(false);
      }
    }
  }, [toast]);
  // --- End OCR PDF Handling ---

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  };

  if (!chatId) {
     return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
        Выберите или создайте чат для начала работы.
      </div>
    );
  }

  if (isLoadingHistory) {
     return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Загрузка истории чата...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map(renderMessage)}
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
        
        <form onSubmit={handleSubmit} className="flex space-x-2 max-w-7xl mx-auto">
          {/* Hidden File Input for PDF */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePdfFileChange}
            accept=".pdf"
            style={{ display: 'none' }}
            disabled={isOcrLoading}
          />

          {/* PDF Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePdfUploadClick}
            disabled={isLoading || isRecording || isOcrLoading}
            aria-label="Загрузить PDF"
          >
            {isOcrLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>
          
          <Button 
            type="button" 
            size="icon"
            variant="outline"
            onClick={toggleRecording}
            disabled={!canInteract || isLoading || isRecording || isOcrLoading}
            className={isRecording ? 'bg-red-100 hover:bg-red-200 text-red-500' : ''}
          >
            {isRecording ? <XIcon className="h-5 w-5" /> : <MicIcon className="h-5 w-5" />}
          </Button>
          
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder={isRecording ? speechStatus : "Введите сообщение..."}
            className="flex-1 resize-none min-h-[40px]"
            rows={1}
            disabled={isLoading || isRecording || isOcrLoading}
          />
          
          <Button 
            type="submit" 
            size="icon"
            disabled={input.trim() === '' || !canInteract || isLoading || isRecording || isOcrLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </Button>
        </form>
        
        {ocrError && (
          <p className="text-xs text-destructive mt-1">{ocrError}</p>
        )}
      </div>
    </div>
  )
} 