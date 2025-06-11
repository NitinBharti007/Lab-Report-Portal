import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import Unauthorized from "@/pages/Unauthorized"
import { Loader } from "@/components/shared/loader"

export function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { userDetails, isAuthenticated, loading } = useAuth()

  // Show loading state while checking authentication and user details
  if (loading || !userDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader message="Loading..." />
      </div>
    )
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If no roles specified, allow access
  if (allowedRoles.length === 0) {
    return children
  }

  // If user's role is not in allowed roles, show Unauthorized page
  if (!allowedRoles.includes(userDetails.role)) {
    return <Unauthorized />
  }

  // If user's role is allowed, render the protected content
  return children
} 