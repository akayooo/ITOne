import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Search, Download, Eye, Trash2, Share2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

interface DiagramItem {
  id: number
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  type: 'sales' | 'order' | 'custom'
}

export function DiagramsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  const [diagrams, setDiagrams] = useState<DiagramItem[]>([
    {
      id: 1,
      name: "Процесс продаж B2B клиентам",
      description: "BPMN диаграмма для процесса продаж корпоративным клиентам",
      createdAt: new Date('2025-04-20T14:30:00'),
      updatedAt: new Date('2025-04-20T15:45:00'),
      type: 'sales'
    },
    {
      id: 2,
      name: "Обработка заказов в интернет-магазине",
      description: "Полный бизнес-процесс от получения заказа до доставки",
      createdAt: new Date('2025-04-19T10:15:00'),
      updatedAt: new Date('2025-04-19T10:15:00'),
      type: 'order'
    },
    {
      id: 3,
      name: "Процесс одобрения кредитов",
      description: "Внутрибанковский процесс принятия решений по кредитам",
      createdAt: new Date('2025-04-18T09:30:00'),
      updatedAt: new Date('2025-04-18T11:20:00'),
      type: 'custom'
    }
  ])
  
  // Handle delete diagram
  const handleDelete = (id: number) => {
    setDiagrams(diagrams.filter(diagram => diagram.id !== id))
    toast({
      title: "Диаграмма удалена",
      description: "Диаграмма была успешно удалена"
    })
  }
  
  // Handle share diagram
  const handleShare = (id: number) => {
    navigator.clipboard.writeText(`https://example.com/diagrams/share/${id}`)
    toast({
      title: "Ссылка скопирована",
      description: "Ссылка на диаграмму скопирована в буфер обмена"
    })
  }
  
  // Handle view diagram (in this demo, just a toast)
  const handleView = (id: number) => {
    toast({
      title: "Просмотр диаграммы",
      description: `Открытие диаграммы с ID: ${id}`
    })
  }
  
  // Filter diagrams based on search term
  const filteredDiagrams = diagrams.filter(diagram => 
    diagram.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    diagram.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Мои BPMN диаграммы</h1>
        <Button onClick={() => window.location.href = '/chat'}>
          Создать новую диаграмму
        </Button>
      </div>
      
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск диаграмм..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {filteredDiagrams.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <p className="mb-2">Диаграммы не найдены</p>
          <p className="text-sm">Попробуйте изменить поисковый запрос или создайте новую диаграмму</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto">
          {filteredDiagrams.map(diagram => (
            <div key={diagram.id} className="border rounded-md overflow-hidden flex flex-col">
              <div className="p-4 bg-muted/30 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{diagram.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{diagram.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex-1 bg-white">
                {/* Simplified diagram preview based on type */}
                <svg width="100%" height="100" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="300" height="100" fill="#f9fafb" />
                  
                  {diagram.type === 'sales' && (
                    <>
                      <circle cx="30" cy="50" r="10" fill="#fff" stroke="#000" />
                      <rect x="60" y="40" width="50" height="20" fill="#fff" stroke="#000" />
                      <rect x="130" y="40" width="50" height="20" fill="#fff" stroke="#000" />
                      <path d="M 200,50 L 210,40 L 220,50 L 210,60 Z" fill="#fff" stroke="#000" />
                      <rect x="240" y="40" width="50" height="20" fill="#fff" stroke="#000" />
                      <line x1="40" y1="50" x2="60" y2="50" stroke="#000" strokeWidth="1" />
                      <line x1="110" y1="50" x2="130" y2="50" stroke="#000" strokeWidth="1" />
                      <line x1="180" y1="50" x2="200" y2="50" stroke="#000" strokeWidth="1" />
                      <line x1="220" y1="50" x2="240" y2="50" stroke="#000" strokeWidth="1" />
                    </>
                  )}
                  
                  {diagram.type === 'order' && (
                    <>
                      <circle cx="30" cy="50" r="10" fill="#fff" stroke="#000" />
                      <rect x="70" y="40" width="40" height="20" fill="#fff" stroke="#000" />
                      <path d="M 140,50 L 150,40 L 160,50 L 150,60 Z" fill="#fff" stroke="#000" />
                      <rect x="190" y="20" width="40" height="20" fill="#fff" stroke="#000" />
                      <rect x="190" y="70" width="40" height="20" fill="#fff" stroke="#000" />
                      <circle cx="260" cy="30" r="10" fill="#fff" stroke="#000" />
                      <circle cx="260" cy="80" r="10" fill="#fff" stroke="#000" />
                      <circle cx="257" cy="30" r="7" fill="#fff" stroke="#000" />
                      <circle cx="257" cy="80" r="7" fill="#fff" stroke="#000" />
                      <line x1="40" y1="50" x2="70" y2="50" stroke="#000" strokeWidth="1" />
                      <line x1="110" y1="50" x2="140" y2="50" stroke="#000" strokeWidth="1" />
                      <line x1="160" y1="50" x2="170" y2="50" stroke="#000" strokeWidth="1" />
                      <line x1="170" y1="50" x2="170" y2="30" stroke="#000" strokeWidth="1" />
                      <line x1="170" y1="50" x2="170" y2="80" stroke="#000" strokeWidth="1" />
                      <line x1="170" y1="30" x2="190" y2="30" stroke="#000" strokeWidth="1" />
                      <line x1="170" y1="80" x2="190" y2="80" stroke="#000" strokeWidth="1" />
                      <line x1="230" y1="30" x2="250" y2="30" stroke="#000" strokeWidth="1" />
                      <line x1="230" y1="80" x2="250" y2="80" stroke="#000" strokeWidth="1" />
                    </>
                  )}
                  
                  {diagram.type === 'custom' && (
                    <>
                      <circle cx="30" cy="50" r="10" fill="#fff" stroke="#000" />
                      <rect x="60" y="40" width="40" height="20" fill="#fff" stroke="#000" />
                      <rect x="130" y="40" width="40" height="20" fill="#fff" stroke="#000" />
                      <rect x="200" y="40" width="40" height="20" fill="#fff" stroke="#000" />
                      <circle cx="270" cy="50" r="10" fill="#fff" stroke="#000" />
                      <circle cx="267" cy="50" r="7" fill="#fff" stroke="#000" />
                      <line x1="40" y1="50" x2="60" y2="50" stroke="#000" strokeWidth="1" />
                      <line x1="100" y1="50" x2="130" y2="50" stroke="#000" strokeWidth="1" />
                      <line x1="170" y1="50" x2="200" y2="50" stroke="#000" strokeWidth="1" />
                      <line x1="240" y1="50" x2="260" y2="50" stroke="#000" strokeWidth="1" />
                    </>
                  )}
                </svg>
              </div>
              
              <div className="p-3 border-t bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Создано: {diagram.createdAt.toLocaleDateString()}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleView(diagram.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleShare(diagram.id)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(diagram.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 