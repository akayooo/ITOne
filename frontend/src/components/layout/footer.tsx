export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex h-16 items-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ПУПИк - AI-powered Dog Walking Route Optimisation
        </p>
      </div>
    </footer>
  )
} 