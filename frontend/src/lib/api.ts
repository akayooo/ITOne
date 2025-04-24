import axios from 'axios'

// Base API configuration
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests if it exists
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Authentication interfaces
export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  full_name?: string
}

export interface User {
  id: number
  username: string
  email: string
  full_name?: string
  disabled: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

// Authentication API functions
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Create URLSearchParams for x-www-form-urlencoded data
    const formData = new URLSearchParams()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)
    
    const response = await axios.post(`${api.defaults.baseURL}/auth/token`, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data
  },
  
  register: async (data: RegisterData): Promise<User> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/users/me')
    return response.data
  }
}

// Chat API interfaces
export interface ChatHistoryEntry {
  id: number
  user_id: number
  chat_id: number
  message: string
  response: string
  image?: string
  piperflow_text?: string
  created_at: string
  updated_at: string
}

export interface ChatEntry {
  user_id: number
  chat_id: number
  message: string
  response: string
  image?: string
  piperflow_text?: string
}

export interface Chat {
  id: number
  user_id: number
  name: string
  created_at: string
  updated_at: string
}

// Chat API functions
export const chatApi = {
  // Get all chats for a user
  getChats: async (): Promise<Chat[]> => {
    const response = await api.get('/chat/chats')
    return response.data
  },
  
  // Create a new chat - можно передать либо отдельные параметры, либо объект
  createChat: async (userIdOrData: number | { user_id: number, name?: string }, name: string = 'Новый чат'): Promise<Chat> => {
    let data: { user_id: number, name: string };
    
    if (typeof userIdOrData === 'number') {
      data = { user_id: userIdOrData, name }
    } else {
      data = { 
        user_id: userIdOrData.user_id, 
        name: userIdOrData.name || 'Новый чат' 
      }
    }
    
    const response = await api.post('/chat/chats', data)
    return response.data
  },
  
  // Update a chat
  updateChat: async (chatId: number, data: Partial<Chat>): Promise<Chat> => {
    const response = await api.put(`/chat/chats/${chatId}`, data)
    return response.data
  },
  
  // Delete a chat
  deleteChat: async (chatId: number): Promise<boolean> => {
    try {
      await api.delete(`/chat/chats/${chatId}`)
      return true
    } catch (error) {
      console.error(`Error deleting chat ${chatId}:`, error)
      return false
    }
  },
  
  // Get chat history
  getChatHistory: async (chatId: number): Promise<ChatHistoryEntry[]> => {
    const response = await api.get(`/chat/chat?chat_id=${chatId}`)
    return response.data
  },
  
  // Save a chat entry
  saveChatEntry: async (entry: ChatEntry): Promise<ChatHistoryEntry> => {
    const response = await api.post('/chat/chat', entry)
    return response.data
  },
  
  // Generate BPMN diagram from text description
  generateBpmnDiagram: async (description: string, requestId?: string): Promise<{
    success: boolean;
    image?: string;
    text?: string;
    error?: string;
    is_bpmn_request?: boolean;
  }> => {
    const response = await api.post('/api/bpmn/generate', { 
      description,
      request_id: requestId || `req_${Date.now()}`
    })
    return response.data
  }
}

export default api 