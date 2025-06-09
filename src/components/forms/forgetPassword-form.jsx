import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
import { supabase } from "@/lib/supabaseClient"

export function ForgotPasswordForm({
  className,
  ...props
}) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Effect to clear messages after 3 seconds
  useEffect(() => {
    if (error || message) {
      const timer = setTimeout(() => {
        setError("")
        setMessage("")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [error, message])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error
      
      setMessage("Check your email for a password reset link. Click the link to set your new password.")
      setEmail("") // Clear the email field after successful submission
    } catch (error) {
      console.error('Reset password request error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm animate-fade-out">
                  {error}
                </div>
              )}
              {message && (
                <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm animate-fade-out">
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
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full cursor-pointer"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost"
                  className="w-full cursor-pointer"
                  onClick={() => navigate("/login")}
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
