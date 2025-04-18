import { useState } from "react"
import { useAuthStore } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Link } from "react-router-dom"

export function RecommendationsPage() {
  const { isAuthenticated } = useAuthStore()
  const { toast } = useToast()
  const [breedType, setBreedType] = useState("")
  const [age, setAge] = useState("")
  const [duration, setDuration] = useState("")
  const [showRecommendations, setShowRecommendations] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast({
        title: "Необходима авторизация",
        description: "Для получения рекомендаций необходимо войти в систему",
        variant: "destructive",
      })
      return
    }
    
    setShowRecommendations(true)
    toast({
      title: "Рекомендации получены",
      description: "Персонализированные маршруты для вашей собаки",
    })
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Рекомендации по маршрутам</h1>
        <p className="mt-2 text-muted-foreground">
          Получите персонализированные маршруты для прогулок с вашей собакой
        </p>
      </div>

      {!isAuthenticated && (
        <div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-medium">Для использования этой функции необходимо авторизоваться</p>
          <div className="mt-4 flex gap-4">
            <Link to="/login">
              <Button>Войти</Button>
            </Link>
            <Link to="/register">
              <Button variant="outline">Зарегистрироваться</Button>
            </Link>
          </div>
        </div>
      )}

      <div className="mb-8 rounded-xl border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="breed">Порода собаки</Label>
                <Input
                  id="breed"
                  placeholder="Например: Лабрадор"
                  value={breedType}
                  onChange={(e) => setBreedType(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Возраст (в годах)</Label>
                <Input
                  id="age"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="Например: 3.5"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Желаемая продолжительность прогулки (минут)</Label>
              <Input
                id="duration"
                type="number"
                min="10"
                step="5"
                placeholder="Например: 30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={!isAuthenticated}>
            Получить рекомендации
          </Button>
        </form>
      </div>

      {showRecommendations && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Рекомендуемые маршруты</h2>
          
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-medium">Рекомендация 1</h3>
              <p className="mt-2 text-muted-foreground">
                Прогулка в парке с умеренной физической нагрузкой, подходящей для {breedType} в возрасте {age} лет.
                Продолжительность: {duration} минут.
              </p>
              <p className="mt-2">Пупупупупупупупупупупуп</p>
            </div>
            
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-medium">Рекомендация 2</h3>
              <p className="mt-2 text-muted-foreground">
                Маршрут вдоль реки с местами для отдыха, идеально подходит для {breedType}.
                Продолжительность: {duration} минут.
              </p>
              <p className="mt-2">Пупупупупупупупупупупупупупупупупупупупупупупуп</p>
            </div>
            
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-medium">Рекомендация 3</h3>
              <p className="mt-2 text-muted-foreground">
                Тихий район с минимальным движением и специальными зонами для собак.
                Продолжительность: {duration} минут.
              </p>
              <p className="mt-2">Пупупупупупупупупупупупупупупупупупуп</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 