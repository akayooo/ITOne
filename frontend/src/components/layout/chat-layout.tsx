import { useEffect, useState } from "react"
import { Outlet, Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  FileText, 
  LogOut, 
  MessageSquare, 
  Plus, 
  Settings, 
  FileSpreadsheet 
} from "lucide-react"

export function ChatLayout() {
  const { user, logout } = useAuthStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([
    { id: 1, name: "Бизнес-процесс продаж", date: "20.04.2025" },
    { id: 2, name: "Процесс обработки заказов", date: "19.04.2025" },
    { id: 3, name: "Платежный процесс", date: "18.04.2025" },
  ])

  const handleLogout = () => {
    logout()
    toast({
      title: "Выход выполнен",
      description: "Вы успешно вышли из системы",
    })
    navigate("/login")
  }

  const handleNewProject = () => {
    const newProject = {
      id: projects.length + 1,
      name: `Новый проект ${projects.length + 1}`,
      date: new Date().toLocaleDateString("ru-RU")
    }
    setProjects([newProject, ...projects])
    toast({
      title: "Проект создан",
      description: `Проект "${newProject.name}" успешно создан`,
    })
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col">
        {/* User info */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="font-medium truncate">
              {user?.full_name || user?.username}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout} 
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {user?.email}
          </div>
        </div>
        
        {/* Navigation */}
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="text-sm font-medium">Проекты</div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={handleNewProject}
              title="Новый проект"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Projects list */}
          <div className="mt-2 space-y-1">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/chat?project=${project.id}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 truncate">
                  <div className="truncate">{project.name}</div>
                  <div className="text-xs text-muted-foreground">{project.date}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Bottom navigation */}
        <div className="mt-auto p-2 border-t">
          <div className="space-y-1">
            <Link
              to="/chat"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Чат</span>
            </Link>
            <Link
              to="/chat/diagrams"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Мои диаграммы</span>
            </Link>
            <Link
              to="/chat/settings"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              <span>Настройки</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
} 