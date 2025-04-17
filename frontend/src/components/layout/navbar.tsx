import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuthStore } from "@/store/auth-store"

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">BPMN Editor</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className="transition-colors hover:text-foreground/80"
            >
              Home
            </Link>
            {isAuthenticated && (
              <Link
                to="/editor"
                className="transition-colors hover:text-foreground/80"
              >
                BPMN Editor
              </Link>
            )}
          </nav>
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="text-sm">
                Hi, {user?.username || 'User'}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
} 