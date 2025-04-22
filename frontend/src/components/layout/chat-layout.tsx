import { useEffect, useState } from "react"
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  FileText, 
  LogOut, 
  MessageSquare, 
  Plus, 
  Settings, 
  FileSpreadsheet,
  Loader2
} from "lucide-react"
import { Chat, chatApi } from "@/lib/api"

export function ChatLayout() {
  const { user, logout } = useAuthStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [chats, setChats] = useState<Chat[]>([])
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  // Load chats when component mounts
  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    setIsLoading(true)
    try {
      const fetchedChats = await chatApi.getChats()
      setChats(fetchedChats)
      console.log("Fetched chats:", fetchedChats)
    } catch (error) {
      console.error("Failed to fetch chats:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список чатов",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast({
      title: "Выход выполнен",
      description: "Вы успешно вышли из системы",
    })
    navigate("/login")
  }

  const handleNewChat = async () => {
    if (isCreatingChat) return
    
    setIsCreatingChat(true)
    try {
      if (!user?.id) {
        throw new Error("Пользователь не авторизован")
      }
      
      const newChat = await chatApi.createChat({
        user_id: user.id,
        name: `Новый чат ${chats.length + 1}`
      })
      
      if (newChat) {
        setChats([newChat, ...chats])
        navigate(`/chat?chatId=${newChat.id}`)
        toast({
          title: "Чат создан",
          description: `Чат "${newChat.name}" успешно создан`,
        })
      } else {
        throw new Error("Не удалось создать чат")
      }
    } catch (error) {
      console.error("Failed to create chat:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать новый чат",
        variant: "destructive"
      })
    } finally {
      setIsCreatingChat(false)
    }
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
            <div className="text-sm font-medium">Чаты</div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={handleNewChat}
              disabled={isCreatingChat}
              title="Новый чат"
            >
              {isCreatingChat ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Chats list */}
          <div className="mt-2 space-y-1 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : chats.length > 0 ? (
              chats.map((chat) => {
                // Extract chatId from URL if present
                const params = new URLSearchParams(location.search)
                const currentChatId = params.get("chatId")
                const isActive = currentChatId === chat.id.toString()
                
                return (
                  <Link
                    key={chat.id}
                    to={`/chat?chatId=${chat.id}`}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer ${
                      isActive ? "bg-accent" : ""
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <div className="truncate">{chat.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(chat.created_at).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Нет доступных чатов
              </div>
            )}
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