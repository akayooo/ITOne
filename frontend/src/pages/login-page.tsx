import { Link } from "react-router-dom"
import { LoginForm } from "@/components/auth/login-form"

export function LoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Log in to your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your username and password to log in
          </p>
        </div>
        
        <LoginForm />
        
        <p className="px-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="underline underline-offset-4 hover:text-primary"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  )
} 