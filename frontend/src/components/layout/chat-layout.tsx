import { useEffect, useState, useRef } from "react"
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  Edit, 
  FileText, 
  LogOut, 
  MessageSquare, 
  Plus, 
  Settings, 
  FileSpreadsheet,
  Loader2,
  Trash2,
  MoreHorizontal,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react"
import { Chat, chatApi } from "@/lib/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export function ChatLayout() {
  const { user, logout } = useAuthStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [chats, setChats] = useState<Chat[]>([])
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null)
  const [chatToRename, setChatToRename] = useState<Chat | null>(null)
  const [newChatName, setNewChatName] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  
  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(256) // Default width in pixels
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef<boolean>(false)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)

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

  const handleDeleteChat = async () => {
    if (!chatToDelete) return

    try {
      const success = await chatApi.deleteChat(chatToDelete.id)
      
      // Удаляем из локального списка независимо от результата, т.к. 204 No Content
      // означает успешное удаление, но API может не вернуть success = true
      setChats(prevChats => prevChats.filter(c => c.id !== chatToDelete.id))
      
      // Если текущий чат был удален, перенаправляем на главную страницу чатов
      const params = new URLSearchParams(location.search)
      const currentChatId = params.get("chatId")
      if (currentChatId === chatToDelete.id.toString()) {
        navigate("/chat")
      }
      
      toast({
        title: "Чат удален",
        description: "Чат успешно удален"
      })
    } catch (error) {
      console.error("Failed to delete chat:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить чат",
        variant: "destructive"
      })
    } finally {
      setChatToDelete(null)
    }
  }

  const handleRenameChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatToRename || !newChatName.trim()) return
    
    setIsRenaming(true)
    try {
      const updatedChat = await chatApi.updateChat(chatToRename.id, { 
        name: newChatName
      })
      
      if (updatedChat) {
        // Обновляем в локальном списке
        setChats(chats.map(c => 
          c.id === chatToRename.id ? { ...c, name: newChatName } : c
        ))
        
        toast({
          title: "Название изменено",
          description: "Название чата успешно изменено"
        })
      } else {
        throw new Error("Не удалось изменить название чата")
      }
    } catch (error) {
      console.error("Failed to rename chat:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось изменить название чата",
        variant: "destructive"
      })
    } finally {
      setIsRenaming(false)
      setChatToRename(null)
    }
  }

  // Handle mouse down on the resizer
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = sidebarWidth
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Handle mouse move during resize
  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return
    const delta = e.clientX - startXRef.current
    const newWidth = Math.max(200, Math.min(400, startWidthRef.current + delta))
    setSidebarWidth(newWidth)
  }

  // Handle mouse up after resize
  const handleMouseUp = () => {
    setIsResizing(false)
    resizingRef.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible)
  }

  // Clean up event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Extract chatId from URL if present
  const params = new URLSearchParams(location.search)
  const currentChatId = params.get("chatId")

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`flex-shrink-0 flex flex-col border-r bg-card transition-all duration-300 ease-in-out ${isResizing ? 'select-none' : ''}`}
        style={{ 
          width: isSidebarVisible ? `${sidebarWidth}px` : '0px',
          opacity: isSidebarVisible ? 1 : 0,
          overflow: isSidebarVisible ? 'visible' : 'hidden'
        }}
      >
        {/* Logo */}
        <div className="w-full px-2 pt-4 pb-4">
          <img 
            src="/logo-3.png" 
            alt="flowmind.ai" 
            className="w-full h-auto object-contain"
          />
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
                const isActive = currentChatId === chat.id.toString()
                
                return (
                  <div 
                    key={chat.id}
                    className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent cursor-pointer group ${
                      isActive ? "bg-accent" : ""
                    }`}
                  >
                    <Link
                      to={`/chat?chatId=${chat.id}`}
                      className="flex items-center flex-1 min-w-0" // min-width для текста
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate">{chat.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {new Date(chat.created_at).toLocaleDateString("ru-RU")}
                        </div>
                      </div>
                    </Link>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            setChatToRename(chat)
                            setNewChatName(chat.name)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Переименовать</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setChatToDelete(chat)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Удалить</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
              to="/chat/settings"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              <span>Настройки</span>
            </Link>
            
            {/* User info */}
            <div className="mt-4 px-3 py-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">
                  {user?.full_name || user?.username}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleLogout} 
                  title="Выйти"
                  className="h-7 w-7"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Resizer */}
      {isSidebarVisible && (
        <div 
          className="w-1 flex-shrink-0 bg-transparent hover:bg-primary/10 cursor-col-resize active:bg-primary/20 transition-colors"
          onMouseDown={handleMouseDown}
        />
      )}
      
      {/* Toggle sidebar button */}
      <div className="absolute left-0 top-4 z-10 transition-transform" style={{ 
        transform: isSidebarVisible ? `translateX(${sidebarWidth}px)` : 'translateX(16px)'
      }}>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full shadow-md"
          onClick={toggleSidebar}
        >
          {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
      
      {/* Dialogs */}
      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить чат</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить чат "{chatToDelete?.name}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!chatToRename} onOpenChange={(open) => !open && setChatToRename(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изменить название чата</AlertDialogTitle>
          </AlertDialogHeader>
          <form onSubmit={handleRenameChat}>
            <div className="flex items-center gap-2 mb-4">
              <Input
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                placeholder="Введите новое название"
                className="flex-1"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Отмена</AlertDialogCancel>
              <Button 
                type="submit" 
                disabled={!newChatName.trim() || isRenaming}
              >
                {isRenaming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Сохранить
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 