import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/lib/auth"
import { useToast } from "@/components/ui/use-toast"

export function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const { login, isLoading, error } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await login({ username, password })
      toast({
        title: "Успешный вход",
        description: "Добро пожаловать в систему создания BPMN диаграмм!",
      })
      navigate("/chat")
    } catch (error) {
      // Error already handled by auth store
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Вход в систему</h1>
          <p className="text-muted-foreground">
            AI-powered BPMN Diagram Creator
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Имя пользователя</Label>
            <Input
              id="username"
              placeholder="Введите имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Вход..." : "Войти"}
          </Button>
        </form>
        
        <div className="text-center text-sm">
          Нет аккаунта?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  )
} 