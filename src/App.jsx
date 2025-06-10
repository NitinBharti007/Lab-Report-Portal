import React from 'react'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './components/shared/theme-provider'
import AppRoutes from './components/common/Routes'
import { UserProvider } from "@/features/user";
import { Toaster } from "@/lib/toast";

const App = () => {
  return (
    <UserProvider>
      <ThemeProvider defaultTheme="dark" storageKey="app-theme">
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </UserProvider>
  )
}

export default App
