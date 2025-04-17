import { Outlet } from "react-router-dom"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { Toaster } from "@/components/ui/toaster"

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
    </div>
  )
} 