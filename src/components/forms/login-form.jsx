import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"

export function LoginForm({
  className,
  ...props
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  // Check for success message from password reset
  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message)
      // Clear the message from location state
      navigate(location.pathname, { replace: true })
    }
  }, [location, navigate])

  // Effect to clear messages after 3 seconds
  useEffect(() => {
    if (message || error) {  // Clear both success and error messages
      const timer = setTimeout(() => {
        setMessage("")
        setError("")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [message, error])  // Add error to dependencies to clear both types of messages

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password")
      setLoading(false)
      return
    }

    try {
      const { error } = await login(email, password)
      if (error) {
        // Handle specific error cases
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.")
        } else if (error.message.includes("Email not confirmed")) {
          setError("Please verify your email address before logging in.")
        } else if (error.message.includes("rate limit")) {
          setError("Too many attempts. Please wait a moment before trying again.")
        } else {
          setError(error.message)
        }
        // Keep the form data when there's an error
        setLoading(false)
        return
      }
      // Only clear form data on successful login
      setEmail("")
      setPassword("")
      navigate("/")
    } catch (error) {
      console.error('Login error:', error)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Login with your email and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-6">
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
              {message && (
                <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {message}
                </div>
              )}
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={error ? "border-red-500" : ""}
                    autoComplete="email"
                  />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigate("/forgot-password", { 
                            state: { from: 'login' },
                            replace: false
                          });
                        } catch (error) {
                          console.error('Navigation error:', error);
                        }
                      }}
                      className="ml-auto text-sm cursor-pointer hover:text-primary"
                      disabled={loading}
                    >
                      Forgot your password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Enter your password"
                    className={error ? "border-red-500" : ""}
                    autoComplete="current-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </div>
                  ) : "Login"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div
        className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
