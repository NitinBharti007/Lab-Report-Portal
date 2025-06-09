import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
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

export function ResetPasswordForm({
  className,
  ...props
}) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Effect to clear error message after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    const handleResetPassword = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          throw sessionError
        }

        // Check if we have a session (which means the reset link was valid)
        if (session) {
          setIsTokenValid(true)
        } else {
          setError("Invalid or expired reset link. Please request a new one.")
        }
      } catch (error) {
        console.error('Reset password error:', error)
        setError("Invalid or expired reset link. Please request a new one.")
      }
    }

    handleResetPassword()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!isTokenValid) {
      setError("Please use a valid reset link")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error
      
      // After successful password update, sign out and redirect to login
      await supabase.auth.signOut()
      navigate("/login", { 
        state: { 
          message: "Password updated successfully. Please login with your new password." 
        }
      })
    } catch (error) {
      console.error('Password update error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isTokenValid && error) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full cursor-pointer"
              onClick={() => navigate("/forgot-password")}
            >
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
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
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Enter your new password"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Re-enter your new password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full cursor-pointer"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 