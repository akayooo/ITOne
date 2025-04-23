import { create } from 'zustand'
import { authApi, User, LoginCredentials, RegisterData } from './api'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  isCheckingAuth: boolean
  login: (credentials: LoginCredentials) => Promise<boolean>
  register: (data: RegisterData) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('token'),
  isCheckingAuth: false,
  
  login: async (credentials) => {
    set({ isLoading: true, error: null, isCheckingAuth: true })
    try {
      const response = await authApi.login(credentials)
      localStorage.setItem('token', response.access_token)
      
      // Fetch user data after successful login
      const user = await authApi.getCurrentUser()
      
      set({ 
        user, 
        token: response.access_token,
        isLoading: false,
        isAuthenticated: true,
        isCheckingAuth: false
      })
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      set({ 
        error: errorMessage, 
        isLoading: false, 
        isAuthenticated: false,
        isCheckingAuth: false 
      })
      return false
    }
  },
  
  register: async (data) => {
    set({ isLoading: true, error: null, isCheckingAuth: true })
    try {
      await authApi.register(data)
      // After registration, login automatically
      const loginResult = await get().login({ 
        username: data.username, 
        password: data.password 
      })
      return loginResult
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      set({ 
        error: errorMessage, 
        isLoading: false,
        isCheckingAuth: false
      })
      return false
    }
  },
  
  logout: () => {
    localStorage.removeItem('token')
    set({ 
      user: null,
      token: null,
      isAuthenticated: false,
    })
  },
  
  checkAuth: async () => {
    // Prevent multiple simultaneous auth checks
    if (get().isCheckingAuth || get().isLoading) {
      return;
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isAuthenticated: false })
      return
    }
    
    set({ isLoading: true, isCheckingAuth: true })
    try {
      const user = await authApi.getCurrentUser()
      
      // Check if we still have a token (user might have logged out during the request)
      if (localStorage.getItem('token')) {
        set({ 
          user,
          isAuthenticated: true,
          isLoading: false,
          isCheckingAuth: false
        })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      // Token may be invalid/expired
      localStorage.removeItem('token')
      set({ 
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isCheckingAuth: false
      })
    }
  }
})) 