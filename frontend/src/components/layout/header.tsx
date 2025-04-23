import { Link } from "react-router-dom"
import { useAuthStore } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const { toast } = useToast()

  const handleLogout = () => {
    logout()
    toast({
      title: "Выход выполнен",
      description: "Вы успешно вышли из системы",
    })
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-1.png" alt="flowmind.ai" className="w-8 h-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">flowmind.ai</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link
              to="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Главная
            </Link>
            <Link
              to="/recommendations"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Рекомендации
            </Link>
            <Link
              to="/diagrams"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              БПМ Диаграммы
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm">
                {user?.full_name || user?.username}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Выйти
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="outline">Войти</Button>
              </Link>
              <Link to="/register">
                <Button>Регистрация</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
} 