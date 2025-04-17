export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} BPMN Editor. All rights reserved.
        </div>
      </div>
    </footer>
  )
} 