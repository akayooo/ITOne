import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth-store"

export function HomePage() {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="container py-12 md:py-20">
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-16">
        <div className="flex max-w-[980px] flex-col items-start gap-2">
          <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
            Interactive BPMN Editor with AI Assistant
          </h1>
          <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
            Create and edit business process diagrams with an AI assistant to help guide you through the process.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {isAuthenticated ? (
            <Button asChild size="lg">
              <Link to="/editor">Open BPMN Editor</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/register">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Login</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="inline-block rounded-lg bg-primary/10 p-3">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">BPMN Diagrams</h3>
            <p className="text-muted-foreground">
              Create professional business process diagrams using the industry standard BPMN notation.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="inline-block rounded-lg bg-primary/10 p-3">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">AI Assistant</h3>
            <p className="text-muted-foreground">
              Get help and suggestions from our AI assistant as you build your diagrams.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="inline-block rounded-lg bg-primary/10 p-3">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.643 0 3.229-.694 4.324-1.825C9.231 18.164 7.8 15.706 7.8 13s1.431-5.164 3.524-6.175A5.217 5.217 0 0 0 7.8 5m0 16a9 9 0 0 1-9-9m9 9c-1.643 0-3.229-.694-4.324-1.825C3.769 18.164 5.2 15.706 5.2 13s-1.431-5.164-3.524-6.175A5.217 5.217 0 0 1 5.2 5m0-2a9 9 0 0 1 9-9" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Intuitive Interface</h3>
            <p className="text-muted-foreground">
              Easy-to-use interface with dark and light theme support, responsive design, and modern aesthetics.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
} 