import { create } from "zustand"
import { ChatMessage, createChatMessage, getChatHistory } from "@/lib/api"

interface ChatState {
  messages: ChatMessage[]
  currentMessage: string
  isLoading: boolean
  error: string | null
  setCurrentMessage: (message: string) => void
  sendMessage: (message: string, botResponse: string) => Promise<void>
  loadChatHistory: () => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentMessage: "",
  isLoading: false,
  error: null,
  
  setCurrentMessage: (message) => {
    set({ currentMessage: message })
  },
  
  sendMessage: async (message, botResponse) => {
    set({ isLoading: true, error: null })
    try {
      const newMessage = await createChatMessage(message, botResponse)
      set({
        messages: [newMessage, ...get().messages],
        currentMessage: "",
        isLoading: false
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to send message",
        isLoading: false
      })
    }
  },
  
  loadChatHistory: async () => {
    set({ isLoading: true, error: null })
    try {
      const messages = await getChatHistory()
      set({ messages, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Failed to load chat history",
        isLoading: false
      })
    }
  }
})) 