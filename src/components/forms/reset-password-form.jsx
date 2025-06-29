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

export function ResetPasswordForm({
  className,
  ...props
}) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isValidReset, setIsValidReset] = useState(false)
  const navigate = useNavigate()

  // Check if we're in a valid password reset state
  useEffect(() => {
    const checkResetState = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          throw sessionError
        }

        // If we have a session, we're in a valid reset state
        if (session) {
          console.log('Valid reset session:', session)
          setIsValidReset(true)
        } else {
          console.log('No session found')
          setError("Invalid or expired reset link. Please request a new one.")
        }
      } catch (error) {
        console.error('Reset state check error:', error)
        setError("Invalid or expired reset link. Please request a new one.")
      }
    }

    checkResetState()
  }, [])

  // Effect to clear error message after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!isValidReset) {
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
      // Use replace: true to prevent going back to reset password page
      navigate("/login", { 
        replace: true,
        state: { 
          message: "Password updated successfully. Please login with your new password." 
        }
      })
    } catch (error) {
      console.error('Password update error:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  if (!isValidReset && error) {
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