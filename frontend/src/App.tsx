import { Route, Routes, Navigate } from "react-router-dom"
import { useEffect } from "react"
import { useAuthStore } from "@/lib/auth"
import { LoginPage } from "@/pages/auth/login"
import { RegisterPage } from "@/pages/auth/register"
import { ChatLayout } from "@/components/layout/chat-layout"
import { BpmnChat } from "@/pages/bpmn-chat"
import { DiagramsPage } from "@/pages/diagrams"
import { BpmnEditorPage } from "@/pages/bpmn-editor"

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore()
  
  // Check auth once when the app loads
  useEffect(() => {
    // Only check auth if we have a token
    const token = localStorage.getItem('token')
    if (token) {
      checkAuth()
    }
  }, []) // Empty dependency array ensures this runs only once

  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />
    }
    return <>{children}</>
  }

  return (
    <Routes>
      {/* Redirect the root to the chat when authenticated */}
      <Route 
        path="/" 
        element={
          isAuthenticated 
            ? <Navigate to="/chat" /> 
            : <Navigate to="/login" />
        } 
      />
      
      {/* Authentication routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected chat and diagrams routes */}
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BpmnChat />} />
        <Route path="diagrams" element={<DiagramsPage />} />
      </Route>
      
      {/* BPMN Editor Route (full-screen) */}
      <Route 
        path="/diagram-editor" 
        element={
          <ProtectedRoute>
            <BpmnEditorPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App 