import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import Unauthorized from "@/pages/Unauthorized"

export function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { userDetails, isAuthenticated } = useAuth()

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If no roles specified, allow access
  if (allowedRoles.length === 0) {
    return children
  }

  // If user's role is not in allowed roles, show Unauthorized page
  if (!allowedRoles.includes(userDetails?.role)) {
    return <Unauthorized />
  }

  // If user's role is allowed, render the protected content
  return children
} 