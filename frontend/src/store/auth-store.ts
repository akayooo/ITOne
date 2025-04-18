import { create } from "zustand"
import { getCurrentUser, login, logout, register, User, UserLogin, UserRegister } from "@/lib/api"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: UserLogin) => Promise<void>
  register: (userData: UserRegister) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  
  login: async (credentials) => {
    set({ isLoading: true, error: null })
    try {
      const response = await login(credentials)
      const token = response.access_token
      localStorage.setItem("token", token)
      const user = await getCurrentUser(token)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Login failed", 
        isLoading: false,
        isAuthenticated: false 
      })
    }
  },
  
  register: async (userData) => {
    set({ isLoading: true, error: null })
    try {
      await register(userData)
      set({ isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Registration failed", 
        isLoading: false 
      })
    }
  },
  
  logout: () => {
    logout()
    set({ user: null, isAuthenticated: false })
  },
  
  checkAuth: async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      set({ isAuthenticated: false, user: null })
      return
    }
    
    set({ isLoading: true })
    try {
      const user = await getCurrentUser(token)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      logout()
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: null
      })
    }
  }
})) 