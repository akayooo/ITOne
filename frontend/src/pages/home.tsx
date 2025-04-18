import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export function HomePage() {
  return (
    <div className="container py-8">
      <section className="mb-12 space-y-6 md:pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold md:text-4xl">
            "ПУПИк" - AI-powered Dog Walking Route Optimisation
          </h1>
          <p className="text-lg text-muted-foreground">
            Интеллектуальное приложение, которое помогает при выборе маршрутов для прогулок собак для владельцев домашних животных.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link to="/recommendations">
            <Button>Получить рекомендации</Button>
          </Link>
          <Link to="/diagrams">
            <Button variant="outline">БПМ диаграммы</Button>
          </Link>
        </div>
      </section>
      
      <section className="mb-12 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">О приложении</h2>
          <p className="text-muted-foreground">
            Пользователи вводят породу, возраст и желаемую продолжительность прогулки своей собаки. Затем ПУПИк генерирует персонализированные маршруты прогулок, которые учитывают такие факторы как:
          </p>
        </div>
        <ul className="space-y-3">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Расстояние и рельеф (подходит для породы и уровня физической подготовки собаки)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Безопасность (избегание мест с интенсивным движением или зон с ограничениями на выгул)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Наличие инфраструктуры (парки для собак, станции утилизации отходов и питьевые фонтанчики)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Популярность (предложение менее загруженных маршрутов для робких собак или изучение популярных маршрутов для социального взаимодействия)</span>
          </li>
        </ul>
      </section>
      
      <section className="mb-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Как использовать ПУПИк</h2>
          <p className="text-muted-foreground">
            Просто зарегистрируйтесь, войдите в систему и следуйте инструкциям для получения персонализированных рекомендаций по маршрутам выгула собак.
          </p>
        </div>
        <div className="rounded-xl border p-6">
          <div className="space-y-4">
            <h3 className="text-xl font-medium">Основные функции:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">1.</span>
                <span>Регистрация и вход в систему</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">2.</span>
                <span>Просмотр и изменение профиля пользователя</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">3.</span>
                <span>Получение персонализированных рекомендаций</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">4.</span>
                <span>Изучение БПМ диаграмм для процессов приложения</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
} 