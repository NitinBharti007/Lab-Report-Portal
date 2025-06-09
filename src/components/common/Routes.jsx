import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoginPage from "../../features/auth/Login";
import ForgotPasswordPage from "../../features/auth/ForgotPassword";
import Dashboard from "../../features/dashboard";
import ResetPasswordPage from "@/features/auth/ResetPassword";
// import UserDetails from "@/features/user/UserDetails";
import Clinics from "@/features/clinics";
import Patients from "@/features/patients";
import Reports from "@/features/reports";
import UserDetails from "@/features/user";
import NotFound from "@/pages/NotFound";
import Unauthorized from "@/pages/Unauthorized";
import { RoleProtectedRoute } from "./RoleProtectedRoute";
// import Team from "../../features/team";

// Public Route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Only allow direct access to login page
  if (location.pathname !== '/login' && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Auth Route component (for password reset and forgot password)
const AuthRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // For reset password, check if there's a token in the URL
  if (location.pathname === '/reset-password' && !location.search.includes('token=')) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { userDetails } = useAuth();
  const location = useLocation();

  // Function to check if the current path is allowed for the user's role
  const isPathAllowed = (path) => {
    if (!userDetails) return false;

    const adminOnlyPaths = ['/clinics', '/patients'];
    const clientPaths = ['/', '/dashboard', '/reports', '/account'];

    if (userDetails.role === 'admin') {
      return [...adminOnlyPaths, ...clientPaths].includes(path);
    }

    return clientPaths.includes(path);
  };

  // Show Unauthorized page if client tries to access admin routes
  if (userDetails && userDetails.role !== 'admin' && ['/clinics', '/patients'].includes(location.pathname)) {
    return <Unauthorized />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthRoute>
              <ForgotPasswordPage />
            </AuthRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <AuthRoute>
              <ResetPasswordPage />
            </AuthRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <RoleProtectedRoute>
              <Dashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RoleProtectedRoute>
              <Dashboard />
            </RoleProtectedRoute>
          }
        />

        {/* Admin Only Routes */}
        <Route
          path="/clinics"
          element={
            <RoleProtectedRoute allowedRoles={["admin"]}>
              <Clinics />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/patients"
          element={
            <RoleProtectedRoute allowedRoles={["admin"]}>
              <Patients />
            </RoleProtectedRoute>
          }
        />

        {/* Shared Protected Routes */}
        <Route
          path="/reports"
          element={
            <RoleProtectedRoute>
              <Reports />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <RoleProtectedRoute>
              <UserDetails />
            </RoleProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default AppRoutes;
