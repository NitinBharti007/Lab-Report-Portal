import React from 'react'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './components/shared/theme-provider'
import AppRoutes from './components/common/Routes'
import { Toaster } from "@/lib/toast";

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="app-theme">
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
