import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { useAuthStore } from "@/lib/auth"
import { Header } from "./header"
import { Footer } from "./footer"

export function Layout() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
} 